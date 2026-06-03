package middleware

import (
	"strings"

	"inventory-api/config"
	"inventory-api/utils"

	"github.com/gin-gonic/gin"
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
		c.Next()
	}
}
