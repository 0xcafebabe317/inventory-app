package handler

import (
	"inventory-api/model"
	"inventory-api/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ProductHandler struct {
	DB *gorm.DB
}

func (h *ProductHandler) List(c *gin.Context) {
	userID := c.GetInt64("user_id")
	page := parseIntDefault(c.Query("page"), 1)
	pageSize := parseIntDefault(c.Query("page_size"), 20)
	search := c.Query("search")
	category := c.Query("category")
	status := c.Query("status")
	supplierID := c.Query("supplier_id")

	query := h.DB.Where("user_id = ?", userID)
	if supplierID != "" {
		query = query.Where("supplier_id = ?", supplierID)
	}
	if search != "" {
		query = query.Where("name LIKE ? OR barcode LIKE ?", "%"+search+"%", "%"+search+"%")
	}
	if category != "" {
		query = query.Where("category = ?", category)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	} else {
		query = query.Where("status = ?", "active")
	}

	var total int64
	query.Model(&model.Product{}).Count(&total)

	var products []model.Product
	query.Preload("Supplier").Order("updated_at DESC").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&products)

	utils.OK(c, gin.H{
		"list":      products,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

func (h *ProductHandler) Create(c *gin.Context) {
	userID := c.GetInt64("user_id")
	var p model.Product
	if err := c.ShouldBindJSON(&p); err != nil {
		utils.Fail(c, 400, "VALIDATION_ERROR", "参数错误")
		return
	}
	if p.Name == "" {
		utils.Fail(c, 400, "VALIDATION_ERROR", "商品名称不能为空")
		return
	}
	p.UserID = userID
	p.Status = "active"

	if err := h.DB.Create(&p).Error; err != nil {
		utils.Fail(c, 500, "INTERNAL_ERROR", "创建失败")
		return
	}
	utils.OK(c, p)
}

func (h *ProductHandler) Update(c *gin.Context) {
	userID := c.GetInt64("user_id")
	id := c.Param("id")

	var p model.Product
	if err := h.DB.Where("id = ? AND user_id = ?", id, userID).First(&p).Error; err != nil {
		utils.Fail(c, 404, "NOT_FOUND", "商品不存在")
		return
	}

	var updates model.Product
	if err := c.ShouldBindJSON(&updates); err != nil {
		utils.Fail(c, 400, "VALIDATION_ERROR", "参数错误")
		return
	}

	// Only allow updating specific fields
	h.DB.Model(&p).Updates(map[string]any{
		"name":            updates.Name,
		"barcode":         updates.Barcode,
		"spec":            updates.Spec,
		"unit":            updates.Unit,
		"sale_price":      updates.SalePrice,
		"wholesale_price": updates.WholesalePrice,
		"purchase_price":  updates.PurchasePrice,
		"min_stock":       updates.MinStock,
		"category":        updates.Category,
		"image_url":       updates.ImageURL,
		"supplier_id":     updates.SupplierID,
	})

	utils.OK(c, p)
}

func (h *ProductHandler) Deactivate(c *gin.Context) {
	userID := c.GetInt64("user_id")
	id := c.Param("id")

	result := h.DB.Model(&model.Product{}).
		Where("id = ? AND user_id = ?", id, userID).
		Update("status", "inactive")

	if result.RowsAffected == 0 {
		utils.Fail(c, 404, "NOT_FOUND", "商品不存在")
		return
	}
	utils.OK(c, gin.H{"msg": "已下架"})
}

type StockLogResp struct {
	model.StockLog
	SupplierName string  `json:"supplier_name,omitempty"`
	CustomerName string  `json:"customer_name,omitempty"`
	OrderTotal   float64 `json:"order_total,omitempty"`
	UnitPrice    float64 `json:"unit_price,omitempty"`
}

func (h *ProductHandler) StockLog(c *gin.Context) {
	userID := c.GetInt64("user_id")
	productID := c.Param("id")
	page := parseIntDefault(c.Query("page"), 1)
	pageSize := parseIntDefault(c.Query("page_size"), 20)

	var total int64
	h.DB.Model(&model.StockLog{}).
		Where("user_id = ? AND product_id = ?", userID, productID).
		Count(&total)

	var logs []model.StockLog
	h.DB.Where("user_id = ? AND product_id = ?", userID, productID).
		Order("created_at DESC").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&logs)

	// Enrich log entries with related order info
	enriched := make([]StockLogResp, len(logs))
	for i, log := range logs {
		resp := StockLogResp{StockLog: log}
		switch log.RefType {
		case "purchase":
			var item model.PurchaseItem
			if err := h.DB.Where("order_id = ? AND product_id = ?", log.RefID, productID).First(&item).Error; err == nil {
				resp.UnitPrice = item.UnitPrice
				resp.OrderTotal = item.Subtotal
			}
			var order model.PurchaseOrder
			if err := h.DB.Preload("Supplier").Where("id = ?", log.RefID).First(&order).Error; err == nil {
				if order.Supplier.Name != "" {
					resp.SupplierName = order.Supplier.Name
				}
			}
		case "sale", "refund":
			var item model.SaleItem
			if err := h.DB.Where("order_id = ? AND product_id = ?", log.RefID, productID).First(&item).Error; err == nil {
				resp.UnitPrice = item.UnitPrice
				resp.OrderTotal = item.Subtotal
			}
			var saleOrder model.SaleOrder
			if err := h.DB.Preload("Customer").Where("id = ?", log.RefID).First(&saleOrder).Error; err == nil {
				if saleOrder.Customer != nil {
					resp.CustomerName = saleOrder.Customer.Name
				}
			}
		}
		enriched[i] = resp
	}

	utils.OK(c, gin.H{
		"list":      enriched,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

func parseIntDefault(s string, def int) int {
	if s == "" {
		return def
	}
	var n int
	for _, c := range s {
		if c < '0' || c > '9' {
			return def
		}
		n = n*10 + int(c-'0')
	}
	return n
}
