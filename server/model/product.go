package model

import "time"

type Product struct {
	ID            int64     `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID        int64     `gorm:"not null;index:idx_user_id" json:"user_id"`
	Name          string    `gorm:"type:varchar(128);not null" json:"name"`
	Barcode       string    `gorm:"type:varchar(32);default:'';index:idx_barcode" json:"barcode"`
	Spec          string    `gorm:"type:varchar(64);default:''" json:"spec"`
	Unit          string    `gorm:"type:varchar(16);default:'个'" json:"unit"`
	SalePrice      float64   `gorm:"type:decimal(10,2);not null;default:0" json:"sale_price"`
	WholesalePrice float64   `gorm:"type:decimal(10,2);not null;default:0" json:"wholesale_price"`
	PurchasePrice  float64   `gorm:"type:decimal(10,2);not null;default:0" json:"purchase_price"`
	StockQty      int       `gorm:"not null;default:0" json:"stock_qty"`
	MinStock      int       `gorm:"default:0" json:"min_stock"`
	Category      string    `gorm:"type:varchar(32);default:'';index:idx_category" json:"category"`
	ImageURL      string    `gorm:"type:varchar(512);default:''" json:"image_url"`
	SupplierID    *int64    `gorm:"default:null" json:"supplier_id"`
	Supplier      *Supplier `gorm:"foreignKey:SupplierID" json:"supplier,omitempty"`
	Status        string    `gorm:"type:enum('active','inactive');default:'active';index:idx_status" json:"status"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

func (Product) TableName() string { return "product" }
