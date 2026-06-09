package handler

import (
	"inventory-api/model"
	"inventory-api/service"
	"inventory-api/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type SaleHandler struct {
	DB       *gorm.DB
	StockSvc *service.StockService
}

type saleReq struct {
	CustomerID *int64         `json:"customer_id"`
	Items      []saleItemReq  `json:"items" binding:"required"`
	PayMethod  string         `json:"pay_method" binding:"required"`
	PaidAmount float64        `json:"paid_amount"`
	Remark     string         `json:"remark"`
	InvoiceURL string         `json:"invoice_url"`
}

type saleItemReq struct {
	ProductID int64   `json:"product_id" binding:"required"`
	Qty       int     `json:"qty" binding:"required"`
	UnitPrice float64 `json:"unit_price" binding:"required"`
}

func (h *SaleHandler) Create(c *gin.Context) {
	userID := c.GetInt64("user_id")
	var req saleReq
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, 400, "VALIDATION_ERROR", "参数错误")
		return
	}
	if len(req.Items) == 0 {
		utils.Fail(c, 400, "VALIDATION_ERROR", "请添加商品")
		return
	}
	if req.PayMethod != "cash" && req.PayMethod != "wechat" && req.PayMethod != "alipay" && req.PayMethod != "credit" {
		utils.Fail(c, 400, "VALIDATION_ERROR", "收款方式无效")
		return
	}

	var order model.SaleOrder
	err := h.DB.Transaction(func(tx *gorm.DB) error {
		var total float64
		for _, item := range req.Items {
			total += float64(item.Qty) * item.UnitPrice
		}

		creditAmount := total - req.PaidAmount
		if req.PayMethod != "credit" {
			creditAmount = 0
		}

		order = model.SaleOrder{
			UserID:       userID,
			CustomerID:   req.CustomerID,
			TotalAmount:  total,
			PaidAmount:   req.PaidAmount,
			CreditAmount: creditAmount,
			PayMethod:    req.PayMethod,
			Status:       "completed",
			Remark:       req.Remark,
			InvoiceURL:   req.InvoiceURL,
		}
		if err := tx.Create(&order).Error; err != nil {
			return err
		}

		for _, item := range req.Items {
			subtotal := float64(item.Qty) * item.UnitPrice
			si := model.SaleItem{
				OrderID:   order.ID,
				ProductID: item.ProductID,
				Qty:       item.Qty,
				UnitPrice: item.UnitPrice,
				Subtotal:  subtotal,
			}
			if err := tx.Create(&si).Error; err != nil {
				return err
			}

			_, err := h.StockSvc.StockOut(tx, userID, item.ProductID, item.Qty, "sale", order.ID)
			if err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		if err == service.ErrInsufficientStock {
			utils.Fail(c, 400, "INSUFFICIENT_STOCK", "库存不足")
			return
		}
		utils.Fail(c, 500, "INTERNAL_ERROR", "开单失败")
		return
	}

	h.DB.Preload("Customer").Preload("Items.Product.Supplier").First(&order, order.ID)
	utils.OK(c, order)
}

func (h *SaleHandler) List(c *gin.Context) {
	userID := c.GetInt64("user_id")
	page := parseIntDefault(c.Query("page"), 1)
	pageSize := parseIntDefault(c.Query("page_size"), 20)
	customerID := c.Query("customer_id")
	status := c.Query("status")
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	query := h.DB.Where("user_id = ?", userID)
	if customerID != "" {
		query = query.Where("customer_id = ?", customerID)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if startDate != "" {
		query = query.Where("created_at >= ?", startDate)
	}
	if endDate != "" {
		query = query.Where("created_at < ?", endDate+" 23:59:59")
	}

	var total int64
	query.Model(&model.SaleOrder{}).Count(&total)

	var orders []model.SaleOrder
	query.Preload("Customer").
		Preload("Items.Product.Supplier").
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

func (h *SaleHandler) UpdateInvoice(c *gin.Context) {
	userID := c.GetInt64("user_id")
	id := c.Param("id")

	var req struct {
		InvoiceURL string `json:"invoice_url" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, 400, "VALIDATION_ERROR", "请提供发票URL")
		return
	}

	result := h.DB.Model(&model.SaleOrder{}).
		Where("id = ? AND user_id = ?", id, userID).
		Update("invoice_url", req.InvoiceURL)

	if result.RowsAffected == 0 {
		utils.Fail(c, 404, "NOT_FOUND", "销售单不存在")
		return
	}

	utils.OK(c, gin.H{"msg": "发票上传成功"})
}

func (h *SaleHandler) Get(c *gin.Context) {
	userID := c.GetInt64("user_id")
	id := c.Param("id")

	var order model.SaleOrder
	if err := h.DB.Where("id = ? AND user_id = ?", id, userID).
		Preload("Customer").
		Preload("Items.Product.Supplier").
		First(&order).Error; err != nil {
		utils.Fail(c, 404, "NOT_FOUND", "销售单不存在")
		return
	}
	utils.OK(c, order)
}

func (h *SaleHandler) Refund(c *gin.Context) {
	userID := c.GetInt64("user_id")
	id := c.Param("id")

	var order model.SaleOrder
	if err := h.DB.Where("id = ? AND user_id = ?", id, userID).
		Preload("Items").First(&order).Error; err != nil {
		utils.Fail(c, 404, "NOT_FOUND", "销售单不存在")
		return
	}
	if order.Status == "refunded" {
		utils.Fail(c, 400, "VALIDATION_ERROR", "该订单已退货")
		return
	}

	err := h.DB.Transaction(func(tx *gorm.DB) error {
		for _, item := range order.Items {
			_, err := h.StockSvc.StockRefundBack(tx, userID, item.ProductID, item.Qty, order.ID)
			if err != nil {
				return err
			}
		}
		return tx.Model(&order).Update("status", "refunded").Error
	})

	if err != nil {
		utils.Fail(c, 500, "INTERNAL_ERROR", "退货失败")
		return
	}

	utils.OK(c, gin.H{"msg": "退货成功"})
}
