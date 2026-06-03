package handler

import (
	"time"

	"inventory-api/model"
	"inventory-api/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ReportHandler struct {
	DB *gorm.DB
}

func (h *ReportHandler) Summary(c *gin.Context) {
	userID := c.GetInt64("user_id")
	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())

	// Today sales
	var todaySales, todayProfit float64
	h.DB.Model(&model.SaleOrder{}).
		Where("user_id = ? AND status = 'completed' AND created_at >= ?", userID, todayStart).
		Select("COALESCE(SUM(total_amount), 0)").Scan(&todaySales)

	// Month sales
	var monthSales, monthProfit float64
	h.DB.Model(&model.SaleOrder{}).
		Where("user_id = ? AND status = 'completed' AND created_at >= ?", userID, monthStart).
		Select("COALESCE(SUM(total_amount), 0)").Scan(&monthSales)

	// Profit calculation (sale_price - purchase_price) * qty
	h.DB.Raw(`
		SELECT COALESCE(SUM((si.unit_price - COALESCE(p.purchase_price, 0)) * si.qty), 0)
		FROM sale_item si
		JOIN sale_order so ON si.order_id = so.id
		LEFT JOIN product p ON si.product_id = p.id
		WHERE so.user_id = ? AND so.status = 'completed' AND so.created_at >= ?
	`, userID, todayStart).Scan(&todayProfit)

	h.DB.Raw(`
		SELECT COALESCE(SUM((si.unit_price - COALESCE(p.purchase_price, 0)) * si.qty), 0)
		FROM sale_item si
		JOIN sale_order so ON si.order_id = so.id
		LEFT JOIN product p ON si.product_id = p.id
		WHERE so.user_id = ? AND so.status = 'completed' AND so.created_at >= ?
	`, userID, monthStart).Scan(&monthProfit)

	// Total AR
	var totalCredit, totalRepaid float64
	h.DB.Model(&model.SaleOrder{}).
		Where("user_id = ? AND pay_method = 'credit' AND status = 'completed'", userID).
		Select("COALESCE(SUM(credit_amount), 0)").Scan(&totalCredit)
	h.DB.Model(&model.Repayment{}).
		Where("user_id = ?", userID).
		Select("COALESCE(SUM(amount), 0)").Scan(&totalRepaid)

	// Low stock count
	var lowStockCount int64
	h.DB.Model(&model.Product{}).
		Where("user_id = ? AND status = 'active' AND stock_qty <= min_stock AND min_stock > 0", userID).
		Count(&lowStockCount)

	// Today sales list
	var todaySalesList []model.SaleOrder
	h.DB.Where("user_id = ? AND status = 'completed' AND created_at >= ?", userID, todayStart).
		Preload("Customer").
		Preload("Items.Product.Supplier").
		Order("created_at DESC").
		Limit(10).
		Find(&todaySalesList)

	utils.OK(c, gin.H{
		"today_sales":      todaySales,
		"today_profit":     todayProfit,
		"month_sales":      monthSales,
		"month_profit":     monthProfit,
		"total_credit":     totalCredit,
		"total_repaid":     totalRepaid,
		"total_ar":         totalCredit - totalRepaid,
		"low_stock_count":  lowStockCount,
		"today_sales_list": todaySalesList,
	})
}

func (h *ReportHandler) Profit(c *gin.Context) {
	userID := c.GetInt64("user_id")

	// Group by day for the last 30 days
	type DailyProfit struct {
		Date   string  `json:"date"`
		Sales  float64 `json:"sales"`
		Profit float64 `json:"profit"`
	}

	var results []DailyProfit
	h.DB.Raw(`
		SELECT
			DATE(so.created_at) as date,
			COALESCE(SUM(so.total_amount), 0) as sales,
			COALESCE(SUM((si.unit_price - COALESCE(p.purchase_price, 0)) * si.qty), 0) as profit
		FROM sale_order so
		JOIN sale_item si ON si.order_id = so.id
		LEFT JOIN product p ON si.product_id = p.id
		WHERE so.user_id = ? AND so.status = 'completed'
			AND so.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
		GROUP BY DATE(so.created_at)
		ORDER BY date DESC
	`, userID).Scan(&results)

	utils.OK(c, results)
}

func (h *ReportHandler) Inventory(c *gin.Context) {
	userID := c.GetInt64("user_id")

	// Total inventory value (stock_qty * purchase_price)
	var totalValue float64
	h.DB.Raw(`
		SELECT COALESCE(SUM(stock_qty * purchase_price), 0)
		FROM product
		WHERE user_id = ? AND status = 'active'
	`, userID).Scan(&totalValue)

	// Low stock products
	var lowStock []model.Product
	h.DB.Where("user_id = ? AND status = 'active' AND stock_qty <= min_stock AND min_stock > 0", userID).
		Find(&lowStock)

	// Stale products (no sales in 30 days)
	var staleProducts []model.Product
	h.DB.Raw(`
		SELECT p.* FROM product p
		WHERE p.user_id = ? AND p.status = 'active' AND p.stock_qty > 0
		AND p.id NOT IN (
			SELECT DISTINCT si.product_id
			FROM sale_item si
			JOIN sale_order so ON si.order_id = so.id
			WHERE so.user_id = ? AND so.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
		)
	`, userID, userID).Scan(&staleProducts)

	utils.OK(c, gin.H{
		"total_value":     totalValue,
		"low_stock":       lowStock,
		"stale_products":  staleProducts,
	})
}
