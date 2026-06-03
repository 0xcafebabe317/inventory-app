package model

import "time"

type Customer struct {
	ID        int64     `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID    int64     `gorm:"not null;index:idx_user_id" json:"user_id"`
	Name      string    `gorm:"type:varchar(64);not null" json:"name"`
	Phone     string    `gorm:"type:varchar(11);default:''" json:"phone"`
	Wechat    string    `gorm:"type:varchar(32);default:''" json:"wechat"`
	Remark    string    `gorm:"type:varchar(256);default:''" json:"remark"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (Customer) TableName() string { return "customer" }
