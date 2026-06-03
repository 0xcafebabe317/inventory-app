package handler

import (
	"fmt"
	"time"

	"inventory-api/model"

	"github.com/gin-gonic/gin"
	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
)

type ExportHandler struct {
	DB *gorm.DB
}

func (h *ExportHandler) ExportProducts(c *gin.Context) {
	userID := c.GetInt64("user_id")

	var products []model.Product
	h.DB.Where("user_id = ? AND status = 'active'", userID).Find(&products)

	f := excelize.NewFile()
	defer f.Close()
	sheet := "商品列表"
	f.SetSheetName("Sheet1", sheet)

	headers := []string{"名称", "条码", "规格", "单位", "售价", "进价", "库存", "分类"}
	for i, h := range headers {
		cell := fmt.Sprintf("%c1", 'A'+i)
		f.SetCellValue(sheet, cell, h)
	}

	for i, p := range products {
		row := i + 2
		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), p.Name)
		f.SetCellValue(sheet, fmt.Sprintf("B%d", row), p.Barcode)
		f.SetCellValue(sheet, fmt.Sprintf("C%d", row), p.Spec)
		f.SetCellValue(sheet, fmt.Sprintf("D%d", row), p.Unit)
		f.SetCellValue(sheet, fmt.Sprintf("E%d", row), p.SalePrice)
		f.SetCellValue(sheet, fmt.Sprintf("F%d", row), p.PurchasePrice)
		f.SetCellValue(sheet, fmt.Sprintf("G%d", row), p.StockQty)
		f.SetCellValue(sheet, fmt.Sprintf("H%d", row), p.Category)
	}

	buf, _ := f.WriteToBuffer()
	filename := fmt.Sprintf("products_%s.xlsx", time.Now().Format("20060102"))
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	c.Writer.Write(buf.Bytes())
}

func (h *ExportHandler) ExportSales(c *gin.Context) {
	userID := c.GetInt64("user_id")
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	query := h.DB.Where("user_id = ? AND status = 'completed'", userID)
	if startDate != "" {
		query = query.Where("created_at >= ?", startDate)
	}
	if endDate != "" {
		query = query.Where("created_at <= ?", endDate+" 23:59:59")
	}

	var orders []model.SaleOrder
	query.Preload("Customer").Preload("Items.Product").Order("created_at DESC").Find(&orders)

	f := excelize.NewFile()
	defer f.Close()
	sheet := "销售记录"
	f.SetSheetName("Sheet1", sheet)

	headers := []string{"时间", "客户", "商品", "数量", "单价", "金额", "收款方式", "赊账金额"}
	for i, h := range headers {
		cell := fmt.Sprintf("%c1", 'A'+i)
		f.SetCellValue(sheet, cell, h)
	}

	row := 2
	for _, o := range orders {
		customerName := "散客"
		if o.Customer != nil {
			customerName = o.Customer.Name
		}
		for _, item := range o.Items {
			productName := ""
			if item.Product.ID != 0 {
				productName = item.Product.Name
			}
			f.SetCellValue(sheet, fmt.Sprintf("A%d", row), o.CreatedAt.Format("2006-01-02 15:04"))
			f.SetCellValue(sheet, fmt.Sprintf("B%d", row), customerName)
			f.SetCellValue(sheet, fmt.Sprintf("C%d", row), productName)
			f.SetCellValue(sheet, fmt.Sprintf("D%d", row), item.Qty)
			f.SetCellValue(sheet, fmt.Sprintf("E%d", row), item.UnitPrice)
			f.SetCellValue(sheet, fmt.Sprintf("F%d", row), item.Subtotal)
			f.SetCellValue(sheet, fmt.Sprintf("G%d", row), o.PayMethod)
			f.SetCellValue(sheet, fmt.Sprintf("H%d", row), o.CreditAmount)
			row++
		}
	}

	buf, _ := f.WriteToBuffer()
	filename := fmt.Sprintf("sales_%s.xlsx", time.Now().Format("20060102"))
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	c.Writer.Write(buf.Bytes())
}
