package handler

import (
	"inventory-api/model"
	"inventory-api/service"
	"inventory-api/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type PurchaseHandler struct {
	DB          *gorm.DB
	StockSvc    *service.StockService
}

type purchaseReq struct {
	SupplierID int64             `json:"supplier_id" binding:"required"`
	Items      []purchaseItemReq `json:"items" binding:"required"`
	PaidAmount float64           `json:"paid_amount"`
	Remark     string             `json:"remark"`
}

type purchaseItemReq struct {
	ProductID int64   `json:"product_id" binding:"required"`
	Qty       int     `json:"qty" binding:"required"`
	UnitPrice float64 `json:"unit_price" binding:"required"`
}

func (h *PurchaseHandler) Create(c *gin.Context) {
	userID := c.GetInt64("user_id")
	var req purchaseReq
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, 400, "VALIDATION_ERROR", "参数错误")
		return
	}
	if len(req.Items) == 0 {
		utils.Fail(c, 400, "VALIDATION_ERROR", "请添加商品")
		return
	}

	var order model.PurchaseOrder
	err := h.DB.Transaction(func(tx *gorm.DB) error {
		// calc total
		var total float64
		for _, item := range req.Items {
			total += float64(item.Qty) * item.UnitPrice
		}

		order = model.PurchaseOrder{
			UserID:      userID,
			SupplierID:  req.SupplierID,
			TotalAmount: total,
			PaidAmount:  req.PaidAmount,
			Remark:      req.Remark,
		}
		if err := tx.Create(&order).Error; err != nil {
			return err
		}

		for _, item := range req.Items {
			subtotal := float64(item.Qty) * item.UnitPrice
			pi := model.PurchaseItem{
				OrderID:   order.ID,
				ProductID: item.ProductID,
				Qty:       item.Qty,
				UnitPrice: item.UnitPrice,
				Subtotal:  subtotal,
			}
			if err := tx.Create(&pi).Error; err != nil {
				return err
			}

			// stock in
			_, err := h.StockSvc.StockIn(tx, userID, item.ProductID, item.Qty, "purchase", order.ID)
			if err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		utils.Fail(c, 500, "INTERNAL_ERROR", "入库失败")
		return
	}

	// reload with relations
	h.DB.Preload("Supplier").Preload("Items.Product").First(&order, order.ID)
	utils.OK(c, order)
}

func (h *PurchaseHandler) List(c *gin.Context) {
	userID := c.GetInt64("user_id")
	page := parseIntDefault(c.Query("page"), 1)
	pageSize := parseIntDefault(c.Query("page_size"), 20)
	supplierID := c.Query("supplier_id")

	query := h.DB.Where("user_id = ?", userID)
	if supplierID != "" {
		query = query.Where("supplier_id = ?", supplierID)
	}

	var total int64
	query.Model(&model.PurchaseOrder{}).Count(&total)

	var orders []model.PurchaseOrder
	query.Preload("Supplier").
		Preload("Items.Product").
		Order("created_at DESC").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&orders)

	utils.OK(c, gin.H{
		"list":      orders,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

func (h *PurchaseHandler) Get(c *gin.Context) {
	userID := c.GetInt64("user_id")
	id := c.Param("id")

	var order model.PurchaseOrder
	if err := h.DB.Where("id = ? AND user_id = ?", id, userID).
		Preload("Supplier").
		Preload("Items.Product").
		First(&order).Error; err != nil {
		utils.Fail(c, 404, "NOT_FOUND", "进货单不存在")
		return
	}
	utils.OK(c, order)
}
