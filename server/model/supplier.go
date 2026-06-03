package model

import "time"

type Supplier struct {
	ID          int64     `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID      int64     `gorm:"not null;index:idx_user_id" json:"user_id"`
	Name        string    `gorm:"type:varchar(64);not null" json:"name"`
	ContactName string    `gorm:"type:varchar(32);default:''" json:"contact_name"`
	Phone       string    `gorm:"type:varchar(11);default:''" json:"phone"`
	Remark      string    `gorm:"type:varchar(256);default:''" json:"remark"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (Supplier) TableName() string { return "supplier" }
