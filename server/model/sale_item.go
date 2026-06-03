package model

type SaleItem struct {
	ID        int64   `gorm:"primaryKey;autoIncrement" json:"id"`
	OrderID   int64   `gorm:"not null;index:idx_order_id" json:"order_id"`
	ProductID int64   `gorm:"not null" json:"product_id"`
	Qty       int     `gorm:"not null" json:"qty"`
	UnitPrice float64 `gorm:"type:decimal(10,2);not null" json:"unit_price"`
	Subtotal  float64 `gorm:"type:decimal(10,2);not null" json:"subtotal"`
	Product   Product `gorm:"foreignKey:ProductID" json:"product,omitempty"`
}

func (SaleItem) TableName() string { return "sale_item" }
