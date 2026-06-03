package model

import "time"

type StockLog struct {
	ID        int64     `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID    int64     `gorm:"not null;index:idx_user_product,priority:1" json:"user_id"`
	ProductID int64     `gorm:"not null;index:idx_user_product,priority:2" json:"product_id"`
	Type      string    `gorm:"type:enum('in','out','refund_back');not null" json:"type"`
	Qty       int       `gorm:"not null" json:"qty"`
	BeforeQty int       `gorm:"not null" json:"before_qty"`
	AfterQty  int       `gorm:"not null" json:"after_qty"`
	RefType   string    `gorm:"type:enum('purchase','sale','refund','adjust');not null;index:idx_ref" json:"ref_type"`
	RefID     int64     `gorm:"not null;index:idx_ref" json:"ref_id"`
	CreatedAt time.Time `gorm:"index:idx_created_at" json:"created_at"`
}

func (StockLog) TableName() string { return "stock_log" }
