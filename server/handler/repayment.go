package handler

import (
	"inventory-api/model"
	"inventory-api/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type RepaymentHandler struct {
	DB *gorm.DB
}

func (h *RepaymentHandler) Create(c *gin.Context) {
	userID := c.GetInt64("user_id")
	var r model.Repayment
	if err := c.ShouldBindJSON(&r); err != nil {
		utils.Fail(c, 400, "VALIDATION_ERROR", "参数错误")
		return
	}
	if r.CustomerID == 0 || r.Amount <= 0 {
		utils.Fail(c, 400, "VALIDATION_ERROR", "请填写客户和金额")
		return
	}
	if r.PayMethod != "cash" && r.PayMethod != "wechat" && r.PayMethod != "alipay" {
		utils.Fail(c, 400, "VALIDATION_ERROR", "收款方式无效")
		return
	}
	r.UserID = userID
	if err := h.DB.Create(&r).Error; err != nil {
		utils.Fail(c, 500, "INTERNAL_ERROR", "记录失败")
		return
	}
	utils.OK(c, r)
}
