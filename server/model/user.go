package model

import "time"

type User struct {
	ID                    int64      `gorm:"primaryKey;autoIncrement" json:"id"`
	Openid                *string    `gorm:"type:varchar(64);index" json:"openid"`
	Nickname              string     `gorm:"type:varchar(64);not null;uniqueIndex" json:"nickname"`
	Phone                 string     `gorm:"type:varchar(11);default:''" json:"phone,omitempty"`
	PasswordHash          string     `gorm:"type:varchar(256);default:''" json:"-"`
	PasswordPlain         string     `gorm:"type:text" json:"-"` // AES-encrypted plaintext, admin-viewable
	AvatarURL             string     `gorm:"type:varchar(512);default:''" json:"avatar_url"`
	SubscriptionStatus    string     `gorm:"type:enum('trial','active','expired','disabled');default:'trial';index:idx_status" json:"subscription_status"`
	SubscriptionPlan      string     `gorm:"type:enum('custom','monthly','quarterly','yearly','permanent');default:null" json:"subscription_plan"`
	TrialStartAt          time.Time  `gorm:"not null" json:"trial_start_at"`
	SubscriptionExpiresAt *time.Time `gorm:"default:null" json:"subscription_expires_at"`
	PasswordChangedAt     *time.Time `gorm:"default:null" json:"-"`
	NicknameChangedAt     *time.Time `gorm:"default:null" json:"nickname_changed_at"`
	CreatedAt             time.Time  `json:"created_at"`
	UpdatedAt             time.Time  `json:"updated_at"`
}

func (User) TableName() string { return "user" }
