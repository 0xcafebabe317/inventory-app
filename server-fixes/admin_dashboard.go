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
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	weekLater := now.Add(7 * 24 * time.Hour)

	var totalUsers, activeUsers, newThisMonth int64
	h.DB.Model(&model.User{}).Count(&totalUsers)
	h.DB.Model(&model.User{}).Where("subscription_status = 'active'").Count(&activeUsers)
	h.DB.Model(&model.User{}).Where("created_at >= ?", monthStart).Count(&newThisMonth)

	// Users expiring in next 7 days
	var expiringUsers []model.User
	h.DB.Where("subscription_status = 'active' AND subscription_expires_at BETWEEN ? AND ?", now, weekLater).
		Order("subscription_expires_at ASC").
		Find(&expiringUsers)

	type ExpiringUser struct {
		model.User
		PhoneMasked string `json:"phone_masked"`
	}
	var result []ExpiringUser
	for _, u := range expiringUsers {
		result = append(result, ExpiringUser{
			User:        u,
			PhoneMasked: maskPhone(u.Phone),
		})
	}

	utils.OK(c, gin.H{
		"total_users":     totalUsers,
		"active_users":    activeUsers,
		"new_this_month":  newThisMonth,
		"expiring_users":  result,
	})
}

func (h *AdminDashboardHandler) OperationLogs(c *gin.Context) {
	page := parseIntDefault(c.Query("page"), 1)
	pageSize := parseIntDefault(c.Query("page_size"), 20)

	var total int64
	h.DB.Model(&model.AdminOperationLog{}).Count(&total)

	type LogResp struct {
		model.AdminOperationLog
		AdminName string `json:"admin_name"`
	}
	var logs []LogResp
	h.DB.Table("admin_operation_log").
		Select("admin_operation_log.*, admin.username as admin_name").
		Joins("LEFT JOIN admin ON admin.id = admin_operation_log.admin_id").
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
