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
