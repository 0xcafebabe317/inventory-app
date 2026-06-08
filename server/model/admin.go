package model

import "time"

type Admin struct {
	ID                int64      `gorm:"primaryKey;autoIncrement" json:"id"`
	Username          string     `gorm:"type:varchar(32);not null;uniqueIndex" json:"username"`
	PasswordHash      string     `gorm:"type:varchar(256);not null" json:"-"`
	PasswordChangedAt *time.Time `gorm:"default:null" json:"-"`
	CreatedAt         time.Time  `json:"created_at"`
}

func (Admin) TableName() string { return "admin" }
