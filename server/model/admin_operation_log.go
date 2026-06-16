package model

import "time"

type AdminOperationLog struct {
	ID        int64     `gorm:"primaryKey;autoIncrement" json:"id"`
	AdminID   int64     `gorm:"not null" json:"admin_id"`
	UserID    int64     `gorm:"not null;index:idx_user_id" json:"user_id"`
	Action    string    `gorm:"type:enum('activate','renew','disable','reset_password','view_password');not null" json:"action"`
	Plan      string    `gorm:"type:enum('custom','monthly','quarterly','yearly','permanent')" json:"plan"`
	ExpiresAt *time.Time `json:"expires_at"`
	Remark    string    `gorm:"type:varchar(256);default:''" json:"remark"`
	CreatedAt time.Time `gorm:"index:idx_created_at" json:"created_at"`
}

func (AdminOperationLog) TableName() string { return "admin_operation_log" }
