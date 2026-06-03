package model

import "time"

type SaleOrder struct {
	ID           int64      `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID       int64      `gorm:"not null;index:idx_user_id" json:"user_id"`
	CustomerID   *int64     `gorm:"default:null;index:idx_customer" json:"customer_id"`
	TotalAmount  float64    `gorm:"type:decimal(10,2);not null;default:0" json:"total_amount"`
	PaidAmount   float64    `gorm:"type:decimal(10,2);not null;default:0" json:"paid_amount"`
	CreditAmount float64    `gorm:"type:decimal(10,2);not null;default:0" json:"credit_amount"`
	PayMethod    string     `gorm:"type:enum('cash','wechat','alipay','credit');not null" json:"pay_method"`
	Status       string     `gorm:"type:enum('completed','refunded');default:'completed';index:idx_status" json:"status"`
	Remark       string     `gorm:"type:varchar(256);default:''" json:"remark"`
	CreatedAt    time.Time  `gorm:"index:idx_created_at" json:"created_at"`
	Customer     *Customer  `gorm:"foreignKey:CustomerID" json:"customer,omitempty"`
	Items        []SaleItem `gorm:"foreignKey:OrderID" json:"items,omitempty"`
}

func (SaleOrder) TableName() string { return "sale_order" }
