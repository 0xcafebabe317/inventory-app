package model

import "time"

type User struct {
	ID                    int64      `gorm:"primaryKey;autoIncrement" json:"id"`
	Openid                *string    `gorm:"type:varchar(64);index" json:"openid"`
	Phone                 string     `gorm:"type:varchar(11);not null;uniqueIndex" json:"phone"`
	PasswordHash          string     `gorm:"type:varchar(256);default:''" json:"-"`
	Nickname              string     `gorm:"type:varchar(64);default:''" json:"nickname"`
	AvatarURL             string     `gorm:"type:varchar(512);default:''" json:"avatar_url"`
	SubscriptionStatus    string     `gorm:"type:enum('trial','active','expired','disabled');default:'trial';index:idx_status" json:"subscription_status"`
	SubscriptionPlan      string     `gorm:"type:enum('custom','monthly','quarterly','yearly','permanent');default:null" json:"subscription_plan"`
	TrialStartAt          time.Time  `gorm:"not null" json:"trial_start_at"`
	SubscriptionExpiresAt *time.Time `gorm:"default:null" json:"subscription_expires_at"`
	PasswordChangedAt     *time.Time `gorm:"default:null" json:"-"`
	CreatedAt             time.Time  `json:"created_at"`
	UpdatedAt             time.Time  `json:"updated_at"`
}

func (User) TableName() string { return "user" }
