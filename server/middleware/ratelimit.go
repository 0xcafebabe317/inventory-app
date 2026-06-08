package middleware

import (
	"fmt"
	"time"

	"inventory-api/utils"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

func RateLimit(rdb *redis.Client, limit int, window time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Use user_id if available, otherwise use client IP
		identifier := c.ClientIP()
		if userID, exists := c.Get("user_id"); exists {
			identifier = fmt.Sprintf("user:%v", userID)
		}

		key := "ratelimit:" + c.Request.URL.Path + ":" + identifier
		ctx := c.Request.Context()

		count, err := rdb.Incr(ctx, key).Result()
		if err != nil {
			c.Next()
			return
		}
		if count == 1 {
			rdb.Expire(ctx, key, window)
		}
		if count > int64(limit) {
			utils.Fail(c, 429, "RATE_LIMITED", "操作太频繁，请稍后")
			c.Abort()
			return
		}
		c.Next()
	}
}
