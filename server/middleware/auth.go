package middleware

import (
	"inventory-api/config"
	"inventory-api/model"
	"inventory-api/utils"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func Auth(cfg *config.Config) gin.HandlerFunc {
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

		claims, err := utils.ParseToken(cfg.JWTSecret, tokenStr)
		if err != nil {
			utils.Fail(c, 401, "UNAUTHORIZED", "invalid or expired token")
			c.Abort()
			return
		}

		c.Set("user_id", claims.UserID)
		c.Set("openid", claims.Openid)
		c.Set("token_issued_at", claims.IssuedAt.Time)
		c.Next()
	}
}

// AuthWithPasswordCheck extends Auth middleware to also verify the token
// was issued after the last password change. Requires DB access.
func AuthWithPasswordCheck(cfg *config.Config, db *gorm.DB) gin.HandlerFunc {
	base := Auth(cfg)
	return func(c *gin.Context) {
		base(c)
		if c.IsAborted() {
			return
		}

		userID := c.GetInt64("user_id")
		tokenIAT := c.GetTime("token_issued_at")

		var user model.User
		if err := db.First(&user, userID).Error; err != nil {
			c.Next()
			return
		}

		if user.PasswordChangedAt != nil && user.PasswordChangedAt.After(tokenIAT) {
			utils.Fail(c, 401, "UNAUTHORIZED", "密码已修改，请重新登录")
			c.Abort()
			return
		}

		c.Next()
	}
}

// DBGetter is an interface for getting *gorm.DB from middleware context
// (used in main.go where db is available)
func GetTime(c *gin.Context) time.Time {
	return c.GetTime("token_issued_at")
}
