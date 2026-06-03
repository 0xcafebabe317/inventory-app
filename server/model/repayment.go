package model

import "time"

type Repayment struct {
	ID         int64     `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID     int64     `gorm:"not null;index:idx_user_id" json:"user_id"`
	CustomerID int64     `gorm:"not null;index:idx_customer" json:"customer_id"`
	Amount     float64   `gorm:"type:decimal(10,2);not null" json:"amount"`
	PayMethod  string    `gorm:"type:enum('cash','wechat','alipay');not null" json:"pay_method"`
	CreatedAt  time.Time `json:"created_at"`
}

func (Repayment) TableName() string { return "repayment" }
