package config

import (
	"os"
)

type Config struct {
	ServerPort   string
	DBDSN        string
	RedisAddr    string
	RedisPass    string
	JWTSecret    string
	AdminUser    string
	AdminPass    string
	WechatAppID  string
	WechatSecret string
	Env          string // "development" or "production"
}

func (c *Config) IsProduction() bool {
	return c.Env == "production"
}

func (c *Config) IsDevelopment() bool {
	return c.Env != "production"
}

func Load() *Config {
	env := getEnv("ENV", "development")
	return &Config{
		ServerPort:   getEnv("SERVER_PORT", "8080"),
		DBDSN:        getEnv("DB_DSN", "root:password@tcp(127.0.0.1:3306)/inventory?charset=utf8mb4&parseTime=True&loc=Local"),
		RedisAddr:    getEnv("REDIS_ADDR", "127.0.0.1:6379"),
		RedisPass:    getEnv("REDIS_PASS", ""),
		JWTSecret:    getEnv("JWT_SECRET", "change-me-in-production"),
		AdminUser:    getEnv("ADMIN_USER", "admin"),
		AdminPass:    getEnv("ADMIN_PASS", "admin123"),
		WechatAppID:  getEnv("WECHAT_APPID", ""),
		WechatSecret: getEnv("WECHAT_SECRET", ""),
		Env:          env,
	}
}

func getEnv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
