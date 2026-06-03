package middleware

import (
	"time"

	"inventory-api/model"
	"inventory-api/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func CheckSubscription(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			c.Next()
			return
		}

		var user model.User
		if err := db.First(&user, userID).Error; err != nil {
			c.Next()
			return
		}

		switch user.SubscriptionStatus {
		case "disabled":
			utils.Fail(c, 403, "EXPIRED", "账户已被停用，请联系管理员")
			c.Abort()
			return
		case "expired":
			utils.Fail(c, 403, "EXPIRED", "使用权限已到期，请联系管理员续期")
			c.Abort()
			return
		case "trial":
			if time.Now().After(user.TrialStartAt.Add(7 * 24 * time.Hour)) {
				// trial expired, update status
				db.Model(&user).Update("subscription_status", "expired")
				utils.Fail(c, 403, "EXPIRED", "试用期已结束，请联系管理员继续使用")
				c.Abort()
				return
			}
		case "active":
			if user.SubscriptionExpiresAt != nil && time.Now().After(*user.SubscriptionExpiresAt) {
				db.Model(&user).Update("subscription_status", "expired")
				utils.Fail(c, 403, "EXPIRED", "使用权限已到期，请联系管理员续期")
				c.Abort()
				return
			}
		}

		c.Next()
	}
}
