package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"inventory-api/config"
	"inventory-api/model"
	"inventory-api/utils"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthHandler struct {
	DB  *gorm.DB
	Cfg *config.Config
}

type wechatLoginReq struct {
	Code string `json:"code" binding:"required"`
}

// openidStr returns the openid string or empty string if nil
func openidStr(u *model.User) string {
	if u.Openid != nil {
		return *u.Openid
	}
	return ""
}

func (h *AuthHandler) WechatLogin(c *gin.Context) {
	var req wechatLoginReq
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, 400, "VALIDATION_ERROR", "缺少code参数")
		return
	}

	openid, err := getOpenid(req.Code, h.Cfg)
	if err != nil {
		utils.Fail(c, 500, "INTERNAL_ERROR", "微信登录失败，请重试")
		return
	}

	var user model.User
	result := h.DB.Where("openid = ?", openid).First(&user)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			// Only auto-create users in explicit development mode
			if h.Cfg.IsDevelopment() {
				phone := fmt.Sprintf("138%08d", time.Now().Unix()%100000000)
				user = model.User{
					Openid:             &openid,
					Phone:              phone,
					Nickname:           "开发测试",
					SubscriptionStatus: "trial",
					TrialStartAt:       time.Now(),
				}
				h.DB.Create(&user)
				access, refresh, _ := utils.GenerateToken(h.Cfg.JWTSecret, user.ID, openid)
				utils.OK(c, gin.H{
					"new_user":        false,
					"access":          access,
					"refresh":         refresh,
					"user":            user,
					"trial_days_left": 7,
					"dev_mode":        true,
				})
				return
			}
			utils.OK(c, gin.H{"new_user": true, "openid": openid})
			return
		}
		utils.Fail(c, 500, "INTERNAL_ERROR", "服务器错误")
		return
	}

	access, refresh, err := utils.GenerateToken(h.Cfg.JWTSecret, user.ID, openidStr(&user))
	if err != nil {
		utils.Fail(c, 500, "INTERNAL_ERROR", "token生成失败")
		return
	}

	trialDaysLeft := 0
	if user.SubscriptionStatus == "trial" {
		elapsed := time.Since(user.TrialStartAt)
		daysLeft := 7 - int(elapsed.Hours()/24)
		if daysLeft > 0 {
			trialDaysLeft = daysLeft
		}
	}

	utils.OK(c, gin.H{
		"new_user":        false,
		"access":          access,
		"refresh":         refresh,
		"user":            user,
		"trial_days_left": trialDaysLeft,
	})
}

// ========== Phone+Password Auth ==========

func (h *AuthHandler) Register(c *gin.Context) {
	var req struct {
		Phone    string `json:"phone" binding:"required"`
		Password string `json:"password" binding:"required,min=8"`
		Nickname string `json:"nickname"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, 400, "VALIDATION_ERROR", "请输入手机号和密码(至少6位)")
		return
	}

	// Check phone uniqueness
	var existing model.User
	if err := h.DB.Where("phone = ?", req.Phone).First(&existing).Error; err == nil {
		utils.Fail(c, 400, "VALIDATION_ERROR", "注册失败，请检查输入信息")
		return
	}

	// Hash password
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		utils.Fail(c, 500, "INTERNAL_ERROR", "服务器错误")
		return
	}

	nickname := req.Nickname
	if nickname == "" {
		nickname = "用户"
	}

	user := model.User{
		Phone:              req.Phone,
		PasswordHash:       string(hash),
		Nickname:           nickname,
		SubscriptionStatus: "trial",
		TrialStartAt:       time.Now(),
	}

	if err := h.DB.Create(&user).Error; err != nil {
		utils.Fail(c, 500, "INTERNAL_ERROR", "创建用户失败")
		return
	}

	access, refresh, err := utils.GenerateToken(h.Cfg.JWTSecret, user.ID, "")
	if err != nil {
		utils.Fail(c, 500, "INTERNAL_ERROR", "token生成失败")
		return
	}

	utils.OK(c, gin.H{
		"access":          access,
		"refresh":         refresh,
		"user":            user,
		"trial_days_left": 7,
	})
}

func (h *AuthHandler) PhoneLogin(c *gin.Context) {
	var req struct {
		Phone    string `json:"phone" binding:"required"`
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, 400, "VALIDATION_ERROR", "请输入手机号和密码")
		return
	}

	var user model.User
	if err := h.DB.Where("phone = ?", req.Phone).First(&user).Error; err != nil {
		utils.Fail(c, 401, "UNAUTHORIZED", "手机号或密码错误")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		utils.Fail(c, 401, "UNAUTHORIZED", "手机号或密码错误")
		return
	}

	access, refresh, err := utils.GenerateToken(h.Cfg.JWTSecret, user.ID, openidStr(&user))
	if err != nil {
		utils.Fail(c, 500, "INTERNAL_ERROR", "token生成失败")
		return
	}

	trialDaysLeft := 0
	if user.SubscriptionStatus == "trial" {
		elapsed := time.Since(user.TrialStartAt)
		daysLeft := 7 - int(elapsed.Hours()/24)
		if daysLeft > 0 {
			trialDaysLeft = daysLeft
		}
	}

	utils.OK(c, gin.H{
		"access":          access,
		"refresh":         refresh,
		"user":            user,
		"trial_days_left": trialDaysLeft,
	})
}

// ========== End Phone+Password Auth ==========

func (h *AuthHandler) BindPhone(c *gin.Context) {
	isDev := h.Cfg.IsDevelopment()

	var req struct {
		Openid        string `json:"openid" binding:"required"`
		EncryptedData string `json:"encrypted_data"`
		Iv            string `json:"iv"`
		Phone         string `json:"phone"`
		Nickname      string `json:"nickname"`
		AvatarURL     string `json:"avatar_url"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, 400, "VALIDATION_ERROR", "参数不完整")
		return
	}

	// Check if openid already bound
	var existing model.User
	if err := h.DB.Where("openid = ?", req.Openid).First(&existing).Error; err == nil {
		utils.Fail(c, 400, "VALIDATION_ERROR", "该微信已绑定手机号")
		return
	}

	// Determine phone: use plain phone if provided, or decrypt in production
	phone := req.Phone
	if phone == "" && isDev {
		phone = req.EncryptedData
		if phone == "" {
			phone = fmt.Sprintf("138%08d", time.Now().Unix()%100000000)
		}
	}
	if phone == "" {
		utils.Fail(c, 400, "VALIDATION_ERROR", "缺少手机号")
		return
	}

	var phoneUser model.User
	if err := h.DB.Where("phone = ?", phone).First(&phoneUser).Error; err == nil {
		utils.Fail(c, 400, "VALIDATION_ERROR", "该手机号已被绑定")
		return
	}

	user := model.User{
		Openid:             &req.Openid,
		Phone:              phone,
		Nickname:           req.Nickname,
		AvatarURL:          req.AvatarURL,
		SubscriptionStatus: "trial",
		TrialStartAt:       time.Now(),
	}

	if err := h.DB.Create(&user).Error; err != nil {
		utils.Fail(c, 500, "INTERNAL_ERROR", "创建用户失败")
		return
	}

	access, refresh, err := utils.GenerateToken(h.Cfg.JWTSecret, user.ID, req.Openid)
	if err != nil {
		utils.Fail(c, 500, "INTERNAL_ERROR", "token生成失败")
		return
	}

	utils.OK(c, gin.H{
		"access":          access,
		"refresh":         refresh,
		"user":            user,
		"trial_days_left": 7,
	})
}

func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var req struct {
		RefreshToken string `json:"refresh_token" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, 400, "VALIDATION_ERROR", "缺少refresh_token")
		return
	}

	claims, err := utils.ParseToken(h.Cfg.JWTSecret, req.RefreshToken)
	if err != nil {
		utils.Fail(c, 401, "UNAUTHORIZED", "refresh token无效")
		return
	}

	access, _, err := utils.GenerateToken(h.Cfg.JWTSecret, claims.UserID, claims.Openid)
	if err != nil {
		utils.Fail(c, 500, "INTERNAL_ERROR", "token生成失败")
		return
	}

	utils.OK(c, gin.H{"access": access})
}

func (h *AuthHandler) GetProfile(c *gin.Context) {
	userID := c.GetInt64("user_id")
	var user model.User
	if err := h.DB.First(&user, userID).Error; err != nil {
		utils.Fail(c, 404, "NOT_FOUND", "用户不存在")
		return
	}

	trialDaysLeft := 0
	if user.SubscriptionStatus == "trial" {
		elapsed := time.Since(user.TrialStartAt)
		daysLeft := 7 - int(elapsed.Hours()/24)
		if daysLeft > 0 {
			trialDaysLeft = daysLeft
		}
	}

	utils.OK(c, gin.H{
		"user":            user,
		"trial_days_left": trialDaysLeft,
	})
}

// ========== Change Password ==========

func (h *AuthHandler) ChangePassword(c *gin.Context) {
	userID := c.GetInt64("user_id")

	var req struct {
		OldPassword string `json:"old_password" binding:"required"`
		NewPassword string `json:"new_password" binding:"required,min=8"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, 400, "VALIDATION_ERROR", "请输入旧密码和新密码(新密码至少6位)")
		return
	}

	var user model.User
	if err := h.DB.First(&user, userID).Error; err != nil {
		utils.Fail(c, 404, "NOT_FOUND", "用户不存在")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.OldPassword)); err != nil {
		utils.Fail(c, 400, "VALIDATION_ERROR", "旧密码错误")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		utils.Fail(c, 500, "INTERNAL_ERROR", "服务器错误")
		return
	}

	now := time.Now()
	h.DB.Model(&user).Updates(map[string]any{
		"password_hash":       string(hash),
		"password_changed_at": now,
	})
	utils.OK(c, gin.H{"msg": "密码修改成功，请重新登录"})
}

func (h *AuthHandler) UpdateProfile(c *gin.Context) {
	userID := c.GetInt64("user_id")

	var req struct {
		Nickname  string `json:"nickname"`
		AvatarURL string `json:"avatar_url"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, 400, "VALIDATION_ERROR", "参数错误")
		return
	}

	updates := map[string]any{}
	if req.Nickname != "" {
		updates["nickname"] = req.Nickname
	}
	if req.AvatarURL != "" {
		updates["avatar_url"] = req.AvatarURL
	}
	if len(updates) == 0 {
		utils.Fail(c, 400, "VALIDATION_ERROR", "无更新内容")
		return
	}

	h.DB.Model(&model.User{}).Where("id = ?", userID).Updates(updates)
	utils.OK(c, gin.H{"msg": "更新成功"})
}

func (h *AuthHandler) AdminChangePassword(c *gin.Context) {
	adminID := c.GetInt64("admin_id")

	var req struct {
		OldPassword string `json:"old_password" binding:"required"`
		NewPassword string `json:"new_password" binding:"required,min=8"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, 400, "VALIDATION_ERROR", "请输入旧密码和新密码(新密码至少6位)")
		return
	}

	var admin model.Admin
	if err := h.DB.First(&admin, adminID).Error; err != nil {
		utils.Fail(c, 404, "NOT_FOUND", "管理员不存在")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(admin.PasswordHash), []byte(req.OldPassword)); err != nil {
		utils.Fail(c, 400, "VALIDATION_ERROR", "旧密码错误")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		utils.Fail(c, 500, "INTERNAL_ERROR", "服务器错误")
		return
	}

	now := time.Now()
	h.DB.Model(&admin).Updates(map[string]any{
		"password_hash":       string(hash),
		"password_changed_at": now,
	})
	utils.OK(c, gin.H{"msg": "密码修改成功，请重新登录"})
}

func (h *AuthHandler) AdminLogin(c *gin.Context) {
	var req struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, 400, "VALIDATION_ERROR", "请输入用户名和密码")
		return
	}

	var admin model.Admin
	if err := h.DB.Where("username = ?", req.Username).First(&admin).Error; err != nil {
		utils.Fail(c, 401, "UNAUTHORIZED", "用户名或密码错误")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(admin.PasswordHash), []byte(req.Password)); err != nil {
		utils.Fail(c, 401, "UNAUTHORIZED", "用户名或密码错误")
		return
	}

	token, err := utils.GenerateAdminToken(h.Cfg.JWTSecret, admin.ID, admin.Username)
	if err != nil {
		utils.Fail(c, 500, "INTERNAL_ERROR", "token生成失败")
		return
	}

	utils.OK(c, gin.H{"access": token, "username": admin.Username})
}

func (h *AuthHandler) AdminProfile(c *gin.Context) {
	adminID := c.GetInt64("admin_id")
	var admin model.Admin
	if err := h.DB.First(&admin, adminID).Error; err != nil {
		utils.Fail(c, 404, "NOT_FOUND", "管理员不存在")
		return
	}
	utils.OK(c, gin.H{"username": admin.Username})
}

// getOpenid exchanges wx.login code for openid.
// In dev mode only, the code is used as the openid directly (for local testing).
func getOpenid(code string, cfg *config.Config) (string, error) {
	// Dev mode: use code as openid for local testing
	if cfg.IsDevelopment() && (cfg.WechatAppID == "" || cfg.WechatAppID == "YOUR_APPID") {
		return fmt.Sprintf("dev_%s", code), nil
	}

	url := fmt.Sprintf("https://api.weixin.qq.com/sns/jscode2session?appid=%s&secret=%s&js_code=%s&grant_type=authorization_code",
		cfg.WechatAppID, cfg.WechatSecret, code)

	resp, err := http.Get(url)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result struct {
		Openid     string `json:"openid"`
		SessionKey string `json:"session_key"`
		ErrCode    int    `json:"errcode"`
		ErrMsg     string `json:"errmsg"`
	}
	json.Unmarshal(body, &result)

	if result.ErrCode != 0 {
		return "", fmt.Errorf("wechat error: %s", result.ErrMsg)
	}
	return result.Openid, nil
}
