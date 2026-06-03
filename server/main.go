package main

import (
	"context"
	"embed"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"strings"
	"time"

	"inventory-api/config"
	"inventory-api/handler"
	"inventory-api/middleware"
	"inventory-api/model"
	"inventory-api/service"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

//go:embed web/admin/*
var adminAssets embed.FS

func main() {
	cfg := config.Load()

	// Database
	db, err := gorm.Open(mysql.Open(cfg.DBDSN), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatalf("Failed to connect database: %v", err)
	}
	sqlDB, _ := db.DB()
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(50)
	sqlDB.SetConnMaxLifetime(time.Hour)

	// Auto-migrate
	db.AutoMigrate(
		&model.User{},
		&model.Admin{},
		&model.AdminOperationLog{},
		&model.Supplier{},
		&model.Product{},
		&model.Customer{},
		&model.PurchaseOrder{},
		&model.PurchaseItem{},
		&model.SaleOrder{},
		&model.SaleItem{},
		&model.StockLog{},
		&model.Repayment{},
	)

	// Seed admin
	seedAdmin(db, cfg)

	// Redis
	rdb := redis.NewClient(&redis.Options{
		Addr:     cfg.RedisAddr,
		Password: cfg.RedisPass,
	})
	if err := rdb.Ping(context.Background()).Err(); err != nil {
		log.Printf("Warning: Redis not available: %v", err)
	}

	// Services
	stockSvc := &service.StockService{}

	// Handlers
	authH := &handler.AuthHandler{DB: db, Cfg: cfg}
	productH := &handler.ProductHandler{DB: db}
	supplierH := &handler.SupplierHandler{DB: db}
	purchaseH := &handler.PurchaseHandler{DB: db, StockSvc: stockSvc}
	saleH := &handler.SaleHandler{DB: db, StockSvc: stockSvc}
	customerH := &handler.CustomerHandler{DB: db}
	repaymentH := &handler.RepaymentHandler{DB: db}
	reportH := &handler.ReportHandler{DB: db}
	exportH := &handler.ExportHandler{DB: db}
	uploadH := &handler.UploadHandler{}
	adminUserH := &handler.AdminUserHandler{DB: db}
	adminDashboardH := &handler.AdminDashboardHandler{DB: db}

	// Router
	r := gin.Default()
	r.RedirectTrailingSlash = false
	r.MaxMultipartMemory = 8 << 20 // 8 MB

	// ===== Public Routes =====
	r.POST("/api/auth/register", authH.Register)
	r.POST("/api/auth/login", authH.PhoneLogin)
	r.POST("/api/auth/wechat-login", authH.WechatLogin)
	r.POST("/api/auth/bind-phone", authH.BindPhone)
	r.POST("/api/auth/refresh", authH.RefreshToken)
	r.GET("/api/auth/seed-admin", authH.SeedAdmin)

	// ===== User API (requires JWT + subscription check) =====
	api := r.Group("/api")
	api.Use(middleware.Auth(cfg))
	api.Use(middleware.CheckSubscription(db))
	{
		// Profile
		api.GET("/user/profile", authH.GetProfile)
			api.PUT("/user/profile", authH.UpdateProfile)
			api.PUT("/user/password", authH.ChangePassword)

		// Products
		api.GET("/products", productH.List)
		api.POST("/products", productH.Create)
		api.PUT("/products/:id", productH.Update)
		api.DELETE("/products/:id", productH.Deactivate)
		api.GET("/products/:id/stock-log", productH.StockLog)

		// Suppliers
		api.GET("/suppliers", supplierH.List)
		api.POST("/suppliers", supplierH.Create)
		api.PUT("/suppliers/:id", supplierH.Update)

		// Purchase orders
		api.POST("/purchase-orders", purchaseH.Create)
		api.GET("/purchase-orders", purchaseH.List)
		api.GET("/purchase-orders/:id", purchaseH.Get)

		// Sale orders
		api.POST("/sale-orders", saleH.Create)
		api.GET("/sale-orders", saleH.List)
		api.GET("/sale-orders/:id", saleH.Get)
		api.POST("/sale-orders/:id/refund", saleH.Refund)

		// Customers
		api.GET("/customers", customerH.List)
		api.POST("/customers", customerH.Create)
		api.PUT("/customers/:id", customerH.Update)
		api.GET("/customers/:id/ledger", customerH.Ledger)

		// Repayments
		api.POST("/repayments", repaymentH.Create)

		// Reports
		api.GET("/reports/summary", reportH.Summary)
		api.GET("/reports/profit", reportH.Profit)
		api.GET("/reports/inventory", reportH.Inventory)

		// Upload
		api.POST("/upload/avatar", uploadH.UploadAvatar)

		// Export
		api.GET("/export/products", exportH.ExportProducts)
		api.GET("/export/sales", exportH.ExportSales)
	}

	// Serve uploaded files from filesystem
	r.Static("/uploads", "./web/uploads")

	// ===== Admin API =====
	adminAPI := r.Group("/admin/api")
	adminAPI.POST("/login", authH.AdminLogin)
	adminAPI.Use(middleware.AdminAuth(cfg))
	{
		adminAPI.GET("/profile", authH.AdminProfile)
		adminAPI.PUT("/password", authH.AdminChangePassword)
		adminAPI.GET("/users", adminUserH.ListUsers)
		adminAPI.GET("/users/:id", adminUserH.GetUser)
		adminAPI.POST("/users/:id/activate", adminUserH.Activate)
		adminAPI.POST("/users/:id/disable", adminUserH.Disable)
		adminAPI.GET("/dashboard", adminDashboardH.Dashboard)
		adminAPI.GET("/operation-logs", adminDashboardH.OperationLogs)

		// Products (admin access)
		adminAPI.GET("/products", productH.List)
		adminAPI.POST("/products", productH.Create)
		adminAPI.PUT("/products/:id", productH.Update)
		adminAPI.DELETE("/products/:id", productH.Deactivate)
		adminAPI.GET("/products/:id/stock-log", productH.StockLog)

		// Sales (admin access)
		adminAPI.GET("/sales", saleH.List)
		adminAPI.GET("/sales/:id", saleH.Get)
		adminAPI.POST("/sales/:id/refund", saleH.Refund)

		// Purchases (admin access)
		adminAPI.GET("/purchases", purchaseH.List)
		adminAPI.GET("/purchases/:id", purchaseH.Get)

		// Customers (admin access)
		adminAPI.GET("/customers", customerH.List)
		adminAPI.GET("/customers/:id/ledger", customerH.Ledger)

		// Reports (admin access)
		adminAPI.GET("/reports/summary", reportH.Summary)
		adminAPI.GET("/reports/profit", reportH.Profit)
		adminAPI.GET("/reports/inventory", reportH.Inventory)

		// Export (admin access)
		adminAPI.GET("/export/products", exportH.ExportProducts)
		adminAPI.GET("/export/sales", exportH.ExportSales)
	}

	// ===== Admin SPA middleware =====
	adminFS, err := fs.Sub(adminAssets, "web/admin")
	if err != nil {
		log.Printf("Warning: admin static files not found: %v", err)
	}

	if adminFS != nil {
		r.Use(func(c *gin.Context) {
			path := c.Request.URL.Path
			// Only intercept /admin paths that are NOT /admin/api
			if !strings.HasPrefix(path, "/admin") || strings.HasPrefix(path, "/admin/api") {
				c.Next()
				return
			}
			// Strip /admin or /admin/ prefix to get the file path
			filePath := strings.TrimPrefix(path, "/admin")
			filePath = strings.TrimPrefix(filePath, "/")
			if filePath == "" {
				filePath = "index.html"
			}
			// Try to read and serve the file directly
			data, err := adminFS.Open(filePath)
			if err != nil {
				// SPA fallback: return index.html
				data, _ = adminFS.Open("index.html")
			}
			if data != nil {
				defer data.Close()
				stat, _ := data.Stat()
				if stat != nil && !stat.IsDir() {
					// Determine content type from file extension
					contentType := "text/html; charset=utf-8"
					if strings.HasSuffix(filePath, ".js") {
						contentType = "application/javascript; charset=utf-8"
					} else if strings.HasSuffix(filePath, ".css") {
						contentType = "text/css; charset=utf-8"
					} else if strings.HasSuffix(filePath, ".svg") {
						contentType = "image/svg+xml"
					}
					buf := make([]byte, stat.Size())
					data.Read(buf)
					c.Data(http.StatusOK, contentType, buf)
					c.Abort()
					return
				}
			}
			// Ultimate fallback: read index.html from embed
			fallback, _ := adminAssets.ReadFile("web/admin/index.html")
			c.Data(http.StatusOK, "text/html; charset=utf-8", fallback)
			c.Abort()
		})
	}

	// Health check
	r.GET("/api/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{"msg": "ok", "time": time.Now().Format(time.RFC3339)})
	})

	log.Printf("Starting server on :%s", cfg.ServerPort)
	r.Run(":" + cfg.ServerPort)
}

func seedAdmin(db *gorm.DB, cfg *config.Config) {
	var count int64
	db.Model(&model.Admin{}).Count(&count)
	if count > 0 {
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(cfg.AdminPass), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("Failed to hash admin password: %v", err)
		return
	}

	admin := model.Admin{
		Username:     cfg.AdminUser,
		PasswordHash: string(hash),
	}
	db.Create(&admin)
	fmt.Printf("Default admin created: %s (change password in production!)\n", cfg.AdminUser)
}
