package handler

import (
	"time"

	"inventory-api/model"
	"inventory-api/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type AdminUserHandler struct {
	DB *gorm.DB
}

func (h *AdminUserHandler) ListUsers(c *gin.Context) {
	page := parseIntDefault(c.Query("page"), 1)
	pageSize := parseIntDefault(c.Query("page_size"), 10)
	nickname := c.Query("nickname")
	status := c.Query("status")
	search := c.Query("search")

	query := h.DB.Model(&model.User{})
	if nickname != "" {
		query = query.Where("nickname LIKE ?", "%"+nickname+"%")
	}
	if status != "" {
		query = query.Where("subscription_status = ?", status)
	}
	if search != "" {
		query = query.Where("nickname LIKE ? OR phone LIKE ?", "%"+search+"%", "%"+search+"%")
	}

	var total int64
	query.Count(&total)

	var users []model.User
	query.Order("created_at DESC").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&users)

	type UserResp struct {
		ID                    int64      `json:"id"`
		Openid                *string    `json:"openid"`
		Nickname              string     `json:"nickname"`
		Phone                 string     `json:"phone,omitempty"`
		AvatarURL             string     `json:"avatar_url"`
		SubscriptionStatus    string     `json:"subscription_status"`
		SubscriptionPlan      string     `json:"subscription_plan"`
		TrialStartAt          time.Time  `json:"trial_start_at"`
		SubscriptionExpiresAt *time.Time `json:"subscription_expires_at"`
		NicknameChangedAt     *time.Time `json:"nickname_changed_at"`
		CreatedAt             time.Time  `json:"created_at"`
		UpdatedAt             time.Time  `json:"updated_at"`
		TrialExpiresAt        string     `json:"trial_expires_at,omitempty"`
	}
	var result []UserResp
	for _, u := range users {
		ur := UserResp{
			ID:                    u.ID,
			Nickname:              u.Nickname,
			Phone:                 u.Phone,
			AvatarURL:             u.AvatarURL,
			SubscriptionStatus:    u.SubscriptionStatus,
			SubscriptionPlan:      u.SubscriptionPlan,
			TrialStartAt:          u.TrialStartAt,
			SubscriptionExpiresAt: u.SubscriptionExpiresAt,
			NicknameChangedAt:     u.NicknameChangedAt,
			CreatedAt:             u.CreatedAt,
			UpdatedAt:             u.UpdatedAt,
		}
		// For trial users, calculate trial expiry as created_at + 7 days
		if u.SubscriptionStatus == "trial" {
			ur.TrialExpiresAt = u.CreatedAt.Add(7 * 24 * time.Hour).Format("2006-01-02")
		}
		result = append(result, ur)
	}

	utils.OK(c, gin.H{
		"list":      result,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

func (h *AdminUserHandler) GetUser(c *gin.Context) {
	id := c.Param("id")
	var user model.User
	if err := h.DB.First(&user, id).Error; err != nil {
		utils.Fail(c, 404, "NOT_FOUND", "用户不存在")
		return
	}
	utils.OK(c, gin.H{
		"user": user,
	})
}

func (h *AdminUserHandler) Activate(c *gin.Context) {
	adminID := c.GetInt64("admin_id")
	userID := c.Param("id")

	var req struct {
		Plan      string `json:"plan" binding:"required"`
		ExpiresAt string `json:"expires_at"`
		Remark    string `json:"remark"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, 400, "VALIDATION_ERROR", "参数错误")
		return
	}

	var user model.User
	if err := h.DB.First(&user, userID).Error; err != nil {
		utils.Fail(c, 404, "NOT_FOUND", "用户不存在")
		return
	}

	now := time.Now()

	// Determine the base date for auto-calculation:
	// Use the user's current expiry if it's still in the future, otherwise use today.
	baseDate := now
	if user.SubscriptionExpiresAt != nil && user.SubscriptionExpiresAt.After(now) {
		baseDate = *user.SubscriptionExpiresAt
	}

	var expiresAt time.Time
	switch req.Plan {
	case "custom":
		if req.ExpiresAt == "" {
			utils.Fail(c, 400, "VALIDATION_ERROR", "自定义续费请选择到期时间")
			return
		}
		var err error
		expiresAt, err = time.Parse("2006-01-02", req.ExpiresAt)
		if err != nil {
			utils.Fail(c, 400, "VALIDATION_ERROR", "日期格式错误，请使用YYYY-MM-DD")
			return
		}
	case "monthly":
		expiresAt = baseDate.AddDate(0, 0, 30)
	case "quarterly":
		expiresAt = baseDate.AddDate(0, 0, 90)
	case "yearly":
		expiresAt = baseDate.AddDate(0, 0, 365)
	case "permanent":
		expiresAt = baseDate.AddDate(99, 0, 0)
	default:
		utils.Fail(c, 400, "VALIDATION_ERROR", "未知套餐类型")
		return
	}

	action := "activate"
	if user.SubscriptionStatus == "active" {
		action = "renew"
	}

	h.DB.Transaction(func(tx *gorm.DB) error {
		tx.Model(&user).Updates(map[string]any{
			"subscription_status":     "active",
			"subscription_plan":      req.Plan,
			"subscription_expires_at": expiresAt,
		})

		tx.Create(&model.AdminOperationLog{
			AdminID:   adminID,
			UserID:    user.ID,
			Action:    action,
			Plan:      req.Plan,
			ExpiresAt: &expiresAt,
			Remark:    req.Remark,
		})
		return nil
	})

	utils.OK(c, gin.H{"msg": "开通成功"})
}

func (h *AdminUserHandler) Disable(c *gin.Context) {
	adminID := c.GetInt64("admin_id")
	userID := c.Param("id")

	var user model.User
	if err := h.DB.First(&user, userID).Error; err != nil {
		utils.Fail(c, 404, "NOT_FOUND", "用户不存在")
		return
	}

	h.DB.Transaction(func(tx *gorm.DB) error {
		tx.Model(&user).Update("subscription_status", "disabled")
		tx.Create(&model.AdminOperationLog{
			AdminID: adminID,
			UserID:  user.ID,
			Action:  "disable",
		})
		return nil
	})

	utils.OK(c, gin.H{"msg": "已停用"})
}
