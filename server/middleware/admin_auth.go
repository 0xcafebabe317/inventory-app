package middleware

import (
	"strings"

	"inventory-api/config"
	"inventory-api/model"
	"inventory-api/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func AdminAuth(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			utils.Fail(c, 401, "UNAUTHORIZED", "missing authorization header")
			c.Abort()
			return
		}

		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenStr == authHeader {
			utils.Fail(c, 401, "UNAUTHORIZED", "invalid authorization format")
			c.Abort()
			return
		}

		claims, err := utils.ParseAdminToken(cfg.JWTSecret, tokenStr)
		if err != nil {
			utils.Fail(c, 401, "UNAUTHORIZED", "invalid or expired token")
			c.Abort()
			return
		}

		c.Set("admin_id", claims.AdminID)
		c.Set("admin_username", claims.Username)
		c.Set("token_issued_at", claims.IssuedAt.Time)
		c.Next()
	}
}

// AdminAuthWithPasswordCheck extends AdminAuth to verify token was issued
// after the last password change.
func AdminAuthWithPasswordCheck(cfg *config.Config, db *gorm.DB) gin.HandlerFunc {
	base := AdminAuth(cfg)
	return func(c *gin.Context) {
		base(c)
		if c.IsAborted() {
			return
		}

		adminID := c.GetInt64("admin_id")
		tokenIAT := c.GetTime("token_issued_at")

		var admin model.Admin
		if err := db.First(&admin, adminID).Error; err != nil {
			c.Next()
			return
		}

		if admin.PasswordChangedAt != nil && admin.PasswordChangedAt.After(tokenIAT) {
			utils.Fail(c, 401, "UNAUTHORIZED", "密码已修改，请重新登录")
			c.Abort()
			return
		}

		c.Next()
	}
}
