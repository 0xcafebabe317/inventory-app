package model

import "time"

type PurchaseOrder struct {
	ID          int64           `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID      int64           `gorm:"not null;index:idx_user_id" json:"user_id"`
	SupplierID  int64           `gorm:"not null;index:idx_supplier" json:"supplier_id"`
	TotalAmount float64         `gorm:"type:decimal(10,2);not null;default:0" json:"total_amount"`
	PaidAmount  float64         `gorm:"type:decimal(10,2);not null;default:0" json:"paid_amount"`
	Remark      string          `gorm:"type:varchar(256);default:''" json:"remark"`
	CreatedAt   time.Time       `gorm:"index:idx_created_at" json:"created_at"`
	Supplier    Supplier        `gorm:"foreignKey:SupplierID" json:"supplier,omitempty"`
	Items       []PurchaseItem  `gorm:"foreignKey:OrderID" json:"items,omitempty"`
}

func (PurchaseOrder) TableName() string { return "purchase_order" }
