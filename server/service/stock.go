package service

import (
	"errors"

	"inventory-api/model"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var ErrInsufficientStock = errors.New("insufficient stock")

type StockService struct{}

func (s *StockService) StockIn(tx *gorm.DB, userID, productID int64, qty int, refType string, refID int64) (*model.StockLog, error) {
	var product model.Product
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("id = ? AND user_id = ?", productID, userID).
		First(&product).Error; err != nil {
		return nil, err
	}

	beforeQty := product.StockQty
	afterQty := beforeQty + qty

	log := model.StockLog{
		UserID:    userID,
		ProductID: productID,
		Type:      "in",
		Qty:       qty,
		BeforeQty: beforeQty,
		AfterQty:  afterQty,
		RefType:   refType,
		RefID:     refID,
	}
	if err := tx.Create(&log).Error; err != nil {
		return nil, err
	}

	if err := tx.Model(&product).Update("stock_qty", afterQty).Error; err != nil {
		return nil, err
	}

	return &log, nil
}

func (s *StockService) StockOut(tx *gorm.DB, userID, productID int64, qty int, refType string, refID int64) (*model.StockLog, error) {
	var product model.Product
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("id = ? AND user_id = ?", productID, userID).
		First(&product).Error; err != nil {
		return nil, err
	}

	if product.StockQty < qty {
		return nil, ErrInsufficientStock
	}

	beforeQty := product.StockQty
	afterQty := beforeQty - qty

	log := model.StockLog{
		UserID:    userID,
		ProductID: productID,
		Type:      "out",
		Qty:       qty,
		BeforeQty: beforeQty,
		AfterQty:  afterQty,
		RefType:   refType,
		RefID:     refID,
	}
	if err := tx.Create(&log).Error; err != nil {
		return nil, err
	}

	if err := tx.Model(&product).Update("stock_qty", afterQty).Error; err != nil {
		return nil, err
	}

	return &log, nil
}

func (s *StockService) StockRefundBack(tx *gorm.DB, userID, productID int64, qty int, refID int64) (*model.StockLog, error) {
	var product model.Product
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("id = ? AND user_id = ?", productID, userID).
		First(&product).Error; err != nil {
		return nil, err
	}

	beforeQty := product.StockQty
	afterQty := beforeQty + qty

	log := model.StockLog{
		UserID:    userID,
		ProductID: productID,
		Type:      "refund_back",
		Qty:       qty,
		BeforeQty: beforeQty,
		AfterQty:  afterQty,
		RefType:   "refund",
		RefID:     refID,
	}
	if err := tx.Create(&log).Error; err != nil {
		return nil, err
	}

	if err := tx.Model(&product).Update("stock_qty", afterQty).Error; err != nil {
		return nil, err
	}

	return &log, nil
}
