package handler

import (
	"inventory-api/model"
	"inventory-api/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type CustomerHandler struct {
	DB *gorm.DB
}

func (h *CustomerHandler) List(c *gin.Context) {
	userID := c.GetInt64("user_id")
	search := c.Query("search")

	query := h.DB.Where("user_id = ?", userID)
	if search != "" {
		query = query.Where("name LIKE ? OR phone LIKE ?", "%"+search+"%", "%"+search+"%")
	}

	var customers []model.Customer
	query.Order("updated_at DESC").Find(&customers)

	// Attach balance for each customer
	type CustomerWithBalance struct {
		model.Customer
		Balance float64 `json:"balance"`
	}

	var result []CustomerWithBalance
	for _, cust := range customers {
		var totalCredit, totalRepaid float64
		h.DB.Model(&model.SaleOrder{}).
			Where("user_id = ? AND customer_id = ? AND pay_method = 'credit' AND status = 'completed'", userID, cust.ID).
			Select("COALESCE(SUM(credit_amount), 0)").Scan(&totalCredit)
		h.DB.Model(&model.Repayment{}).
			Where("user_id = ? AND customer_id = ?", userID, cust.ID).
			Select("COALESCE(SUM(amount), 0)").Scan(&totalRepaid)

		result = append(result, CustomerWithBalance{
			Customer: cust,
			Balance:  totalCredit - totalRepaid,
		})
	}

	utils.OK(c, result)
}

func (h *CustomerHandler) Create(c *gin.Context) {
	userID := c.GetInt64("user_id")
	var cust model.Customer
	if err := c.ShouldBindJSON(&cust); err != nil {
		utils.Fail(c, 400, "VALIDATION_ERROR", "参数错误")
		return
	}
	if cust.Name == "" {
		utils.Fail(c, 400, "VALIDATION_ERROR", "客户名称不能为空")
		return
	}
	cust.UserID = userID
	if err := h.DB.Create(&cust).Error; err != nil {
		utils.Fail(c, 500, "INTERNAL_ERROR", "创建失败")
		return
	}
	utils.OK(c, cust)
}

func (h *CustomerHandler) Update(c *gin.Context) {
	userID := c.GetInt64("user_id")
	id := c.Param("id")

	var cust model.Customer
	if err := h.DB.Where("id = ? AND user_id = ?", id, userID).First(&cust).Error; err != nil {
		utils.Fail(c, 404, "NOT_FOUND", "客户不存在")
		return
	}

	var updates model.Customer
	if err := c.ShouldBindJSON(&updates); err != nil {
		utils.Fail(c, 400, "VALIDATION_ERROR", "参数错误")
		return
	}

	h.DB.Model(&cust).Updates(map[string]any{
		"name":   updates.Name,
		"phone":  updates.Phone,
		"wechat": updates.Wechat,
		"remark": updates.Remark,
	})
	utils.OK(c, cust)
}

func (h *CustomerHandler) Ledger(c *gin.Context) {
	userID := c.GetInt64("user_id")
	id := c.Param("id")

	var cust model.Customer
	if err := h.DB.Where("id = ? AND user_id = ?", id, userID).First(&cust).Error; err != nil {
		utils.Fail(c, 404, "NOT_FOUND", "客户不存在")
		return
	}

	// Get credit sales
	var sales []model.SaleOrder
	h.DB.Where("user_id = ? AND customer_id = ? AND pay_method = 'credit' AND status = 'completed'", userID, id).
		Preload("Items.Product").
		Order("created_at ASC").
		Find(&sales)

	// Get repayments
	var repayments []model.Repayment
	h.DB.Where("user_id = ? AND customer_id = ?", userID, id).
		Order("created_at ASC").
		Find(&repayments)

	// Build transactions
	type Transaction struct {
		Type    string  `json:"type"`
		Amount  float64 `json:"amount"`
		Date    string  `json:"date"`
		Remark  string  `json:"remark"`
	}
	var txns []Transaction
	for _, s := range sales {
		txns = append(txns, Transaction{
			Type:   "sale",
			Amount: s.CreditAmount,
			Date:   s.CreatedAt.Format("2006-01-02 15:04"),
			Remark: s.Remark,
		})
	}
	for _, r := range repayments {
		txns = append(txns, Transaction{
			Type:   "repayment",
			Amount: r.Amount,
			Date:   r.CreatedAt.Format("2006-01-02 15:04"),
			Remark: r.PayMethod,
		})
	}

	var totalCredit, totalRepaid float64
	h.DB.Model(&model.SaleOrder{}).
		Where("user_id = ? AND customer_id = ? AND pay_method = 'credit' AND status = 'completed'", userID, id).
		Select("COALESCE(SUM(credit_amount), 0)").Scan(&totalCredit)
	h.DB.Model(&model.Repayment{}).
		Where("user_id = ? AND customer_id = ?", userID, id).
		Select("COALESCE(SUM(amount), 0)").Scan(&totalRepaid)

	utils.OK(c, gin.H{
		"customer":      cust,
		"total_credit":  totalCredit,
		"total_repaid":  totalRepaid,
		"balance":       totalCredit - totalRepaid,
		"transactions":  txns,
	})
}
