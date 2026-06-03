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
		userID, exists := c.Get("user_id")
		if !exists {
			c.Next()
			return
		}

		key := "ratelimit:" + c.Request.URL.Path + ":" + toString(userID)
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

func toString(v any) string {
	switch val := v.(type) {
	case int64:
		return fmt.Sprintf("%d", val)
	default:
		return fmt.Sprintf("%v", v)
	}
}
