package handler

import (
	"time"

	"inventory-api/model"
	"inventory-api/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type AdminDashboardHandler struct {
	DB *gorm.DB
}

func (h *AdminDashboardHandler) Dashboard(c *gin.Context) {
	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	weekLater := now.Add(7 * 24 * time.Hour)

	var totalUsers, activeUsers, newThisMonth int64
	h.DB.Model(&model.User{}).Count(&totalUsers)
	h.DB.Model(&model.User{}).Where("subscription_status = 'active'").Count(&activeUsers)
	h.DB.Model(&model.User{}).Where("created_at >= ?", monthStart).Count(&newThisMonth)

	// Product count
	var productCount int64
	h.DB.Model(&model.Product{}).Where("status = 'active'").Count(&productCount)

	// Today sales
	var todaySales float64
	h.DB.Model(&model.SaleOrder{}).
		Where("status = 'completed' AND created_at >= ?", todayStart).
		Select("COALESCE(SUM(total_amount), 0)").Scan(&todaySales)

	// Month sales
	var monthSales float64
	h.DB.Model(&model.SaleOrder{}).
		Where("status = 'completed' AND created_at >= ?", monthStart).
		Select("COALESCE(SUM(total_amount), 0)").Scan(&monthSales)

	// Month profit
	var monthProfit float64
	h.DB.Raw(`
		SELECT COALESCE(SUM((si.unit_price - COALESCE(p.purchase_price, 0)) * si.qty), 0)
		FROM sale_item si
		JOIN sale_order so ON si.order_id = so.id
		LEFT JOIN product p ON si.product_id = p.id
		WHERE so.status = 'completed' AND so.created_at >= ?
	`, monthStart).Scan(&monthProfit)

	// Low stock count
	var lowStockCount int64
	h.DB.Model(&model.Product{}).
		Where("status = 'active' AND stock_qty <= min_stock AND min_stock > 0").
		Count(&lowStockCount)

	// Users expiring in next 7 days
	// - active users: subscription_expires_at is set
	// - trial users: expiry = trial_start_at + 7 days, subscription_expires_at is NULL
	var expiringUsers []model.User
	h.DB.Where(`(
		(subscription_status = 'active' AND subscription_expires_at BETWEEN ? AND ?)
		OR
		(subscription_status = 'trial' AND DATE_ADD(trial_start_at, INTERVAL 7 DAY) BETWEEN ? AND ?)
	)`, todayStart, weekLater, todayStart, weekLater).
		Order("COALESCE(subscription_expires_at, DATE_ADD(trial_start_at, INTERVAL 7 DAY)) ASC").
		Find(&expiringUsers)

	// Fill trial users' display expiry date
	for i := range expiringUsers {
		if expiringUsers[i].SubscriptionStatus == "trial" && expiringUsers[i].SubscriptionExpiresAt == nil {
			exp := expiringUsers[i].TrialStartAt.Add(7 * 24 * time.Hour)
			expiringUsers[i].SubscriptionExpiresAt = &exp
		}
	}

	utils.OK(c, gin.H{
		"total_users":     totalUsers,
		"active_users":    activeUsers,
		"new_this_month":  newThisMonth,
		"user_count":      totalUsers,
		"product_count":   productCount,
		"today_sales":     todaySales,
		"month_sales":     monthSales,
		"month_profit":    monthProfit,
		"low_stock_count": lowStockCount,
		"expiring_users":  expiringUsers,
	})
}

type LogResp struct {
	model.AdminOperationLog
	AdminName    string `json:"admin_name"`
	UserNickname string `json:"user_nickname"`
}

func (h *AdminDashboardHandler) OperationLogs(c *gin.Context) {
	page := parseIntDefault(c.Query("page"), 1)
	pageSize := parseIntDefault(c.Query("page_size"), 10)

	var total int64
	h.DB.Model(&model.AdminOperationLog{}).Count(&total)

	var logs []LogResp
	h.DB.Table("admin_operation_log").
		Select("admin_operation_log.*, admin.username as admin_name, user.nickname as user_nickname").
		Joins("LEFT JOIN admin ON admin.id = admin_operation_log.admin_id").
		Joins("LEFT JOIN user ON user.id = admin_operation_log.user_id").
		Order("admin_operation_log.created_at DESC").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Scan(&logs)

	utils.OK(c, gin.H{
		"list":      logs,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}
