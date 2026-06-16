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
	pageSize := parseIntDefault(c.Query("page_size"), 20)
	phone := c.Query("nickname")
	status := c.Query("status")
	search := c.Query("search")

	query := h.DB.Model(&model.User{})
	if phone != "" {
		query = query.Where("nickname LIKE ?", "%"+phone+"%")
	}
	if status != "" {
		query = query.Where("subscription_status = ?", status)
	}
	if search != "" {
		query = query.Where("nickname LIKE ? OR nickname LIKE ?", "%"+search+"%", "%"+search+"%")
	}

	var total int64
	query.Count(&total)

	var users []model.User
	query.Order("created_at DESC").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&users)

	// Mask phone numbers
	type UserResp struct {
		model.User
		Nickname string `json:"phone_masked"`
	}
	var result []UserResp
	for _, u := range users {
		masked := u.Nickname
		result = append(result, UserResp{User: u, Nickname: masked})
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
		"user":          user,
		"phone_masked":  user.Nickname,
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

	var expiresAt time.Time
	if req.Plan == "permanent" {
		expiresAt = time.Date(2099, 12, 31, 0, 0, 0, 0, time.UTC)
	} else {
		if req.ExpiresAt == "" {
			utils.Fail(c, 400, "VALIDATION_ERROR", "请提供到期日期")
			return
		}
		var err error
		expiresAt, err = time.Parse("2006-01-02", req.ExpiresAt)
		if err != nil {
			utils.Fail(c, 400, "VALIDATION_ERROR", "日期格式错误，请使用YYYY-MM-DD")
			return
		}
	}

	var user model.User
	if err := h.DB.First(&user, userID).Error; err != nil {
		utils.Fail(c, 404, "NOT_FOUND", "用户不存在")
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

func maskPhone(phone string) string { return "" }
	if len(phone) < 7 {
		return phone
	}
	return phone[:3] + "****" + phone[len(phone)-4:]
}
