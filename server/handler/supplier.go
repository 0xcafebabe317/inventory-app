package handler

import (
	"inventory-api/model"
	"inventory-api/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type SupplierHandler struct {
	DB *gorm.DB
}

func (h *SupplierHandler) List(c *gin.Context) {
	userID := c.GetInt64("user_id")
	var suppliers []model.Supplier
	h.DB.Where("user_id = ?", userID).Order("updated_at DESC").Find(&suppliers)
	utils.OK(c, suppliers)
}

func (h *SupplierHandler) Create(c *gin.Context) {
	userID := c.GetInt64("user_id")
	var s model.Supplier
	if err := c.ShouldBindJSON(&s); err != nil {
		utils.Fail(c, 400, "VALIDATION_ERROR", "参数错误")
		return
	}
	if s.Name == "" {
		utils.Fail(c, 400, "VALIDATION_ERROR", "供应商名称不能为空")
		return
	}
	s.UserID = userID
	if err := h.DB.Create(&s).Error; err != nil {
		utils.Fail(c, 500, "INTERNAL_ERROR", "创建失败")
		return
	}
	utils.OK(c, s)
}

func (h *SupplierHandler) Update(c *gin.Context) {
	userID := c.GetInt64("user_id")
	id := c.Param("id")

	var s model.Supplier
	if err := h.DB.Where("id = ? AND user_id = ?", id, userID).First(&s).Error; err != nil {
		utils.Fail(c, 404, "NOT_FOUND", "供应商不存在")
		return
	}

	var updates model.Supplier
	if err := c.ShouldBindJSON(&updates); err != nil {
		utils.Fail(c, 400, "VALIDATION_ERROR", "参数错误")
		return
	}

	h.DB.Model(&s).Updates(map[string]any{
		"name":         updates.Name,
		"contact_name": updates.ContactName,
		"phone":        updates.Phone,
		"remark":       updates.Remark,
	})

	utils.OK(c, s)
}

func (h *SupplierHandler) Transactions(c *gin.Context) {
	userID := c.GetInt64("user_id")
	supplierID := c.Param("id")
	page := parseIntDefault(c.Query("page"), 1)
	pageSize := parseIntDefault(c.Query("page_size"), 20)
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")
	search := c.Query("search")

	// Verify supplier belongs to this user
	var supplier model.Supplier
	if err := h.DB.Where("id = ? AND user_id = ?", supplierID, userID).First(&supplier).Error; err != nil {
		utils.Fail(c, 404, "NOT_FOUND", "进货商不存在")
		return
	}

	query := h.DB.Where("purchase_order.user_id = ? AND purchase_order.supplier_id = ?", userID, supplierID)

	// Date range filter
	if startDate != "" {
		query = query.Where("purchase_order.created_at >= ?", startDate)
	}
	if endDate != "" {
		query = query.Where("purchase_order.created_at < ?", endDate+" 23:59:59")
	}

	// Product name search via subquery
	if search != "" {
		query = query.Where(`purchase_order.id IN (
			SELECT pi.order_id FROM purchase_item pi
			JOIN product p ON p.id = pi.product_id
			WHERE p.name LIKE ?
		)`, "%"+search+"%")
	}

	var total int64
	query.Model(&model.PurchaseOrder{}).Count(&total)

	var orders []model.PurchaseOrder
	query.Preload("Supplier").
		Preload("Items.Product").
		Order("purchase_order.created_at DESC").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&orders)

	utils.OK(c, gin.H{
		"list":      orders,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
		"supplier":  supplier,
	})
}
