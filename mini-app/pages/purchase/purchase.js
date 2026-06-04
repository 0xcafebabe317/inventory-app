const request = require('../../utils/request').default
const util = require('../../utils/util')
const auth = require('../../utils/auth')
const app = getApp()

Page({
  data: {
    suppliers: [],
    supplierId: null,
    supplierName: '',
    supplierPhone: '',
    items: [],
    totalAmount: '0.00',
    totalQty: 0,
    remark: '',
    submitting: false,
    showSupplierPicker: false,
    showProductPicker: false,
    productSearch: '',
    allProducts: [],
    pickerProducts: []
  },

  onShow() {
    if (!auth.checkAuth()) { wx.reLaunch({ url: '/pages/login/login' }); return }
    if (app.isLocked()) { wx.redirectTo({ url: '/pages/lock/lock' }); return }
    request('/api/suppliers', 'GET').then(res => {
      this.setData({ suppliers: res.data || [] })
    }).catch(() => {})
  },

  // --- Supplier ---
  openSupplierPicker() { this.setData({ showSupplierPicker: true }) },
  closeSupplierPicker() { this.setData({ showSupplierPicker: false }) },
  selectSupplier(e) {
    const s = e.currentTarget.dataset.supplier
    this.setData({
      supplierId: s.id, supplierName: s.name, supplierPhone: s.phone || '',
      showSupplierPicker: false, items: [], totalAmount: '0.00', totalQty: 0,
      allProducts: [], productSearch: ''
    })
    this.loadProducts(s.id)
  },
  clearSupplier() {
    this.setData({ supplierId: null, supplierName: '', supplierPhone: '', items: [], totalAmount: '0.00', totalQty: 0, allProducts: [], productSearch: '' })
  },

  loadProducts(supplierId) {
    const params = { page_size: 200 }
    if (supplierId) params.supplier_id = supplierId
    request('/api/products', 'GET', params).then(res => {
      const list = (res.data.list || []).map(p => ({
        ...p,
        purchase_price_fmt: util.formatMoney(p.purchase_price || 0)
      }))
      this.setData({ allProducts: list, pickerProducts: list })
    }).catch(() => {})
  },

  // --- Product Picker ---
  openProductPicker() {
    if (!this.data.supplierId) return
    this.setData({ pickerProducts: this.data.allProducts, showProductPicker: true })
  },
  closeProductPicker() { this.setData({ showProductPicker: false, productSearch: '' }) },
  onPickerSearch(e) {
    const val = e.detail
    this.setData({ productSearch: val })
    if (val) {
      const filtered = this.data.allProducts.filter(p => p.name.includes(val) || (p.barcode && p.barcode.includes(val)))
      this.setData({ pickerProducts: filtered })
    } else {
      this.setData({ pickerProducts: this.data.allProducts })
    }
  },
  selectProduct(e) {
    this.addItem(e.currentTarget.dataset.product)
    this.setData({ showProductPicker: false, productSearch: '' })
  },

  // --- Cart ---
  addItem(product) {
    const items = [...this.data.items]
    const price = product.purchase_price || 0
    const idx = items.findIndex(i => i.product_id === product.id)
    if (idx >= 0) {
      items[idx].qty += 1
      items[idx].subtotal_fmt = util.formatMoney(items[idx].qty * price)
    } else {
      items.push({
        product_id: product.id,
        name: product.name,
        spec: product.spec || '',
        unit: product.unit || '个',
        unit_price: price,
        unit_price_fmt: util.formatMoney(price),
        qty: 1,
        subtotal_fmt: util.formatMoney(price)
      })
    }
    this.setData({ items })
    this.calcTotal()
  },
  changeQty(e) {
    const { idx, delta } = e.currentTarget.dataset
    const items = this.data.items
    items[idx].qty = Math.max(1, items[idx].qty + parseInt(delta))
    items[idx].subtotal_fmt = util.formatMoney(items[idx].qty * items[idx].unit_price)
    this.setData({ items })
    this.calcTotal()
  },
  onQtyInput(e) {
    const idx = e.currentTarget.dataset.idx
    const val = parseInt(e.detail.value)
    if (!isNaN(val) && val >= 1) {
      const items = this.data.items
      items[idx].qty = Math.min(val, 9999)
      items[idx].subtotal_fmt = util.formatMoney(items[idx].qty * items[idx].unit_price)
      this.setData({ items })
      this.calcTotal()
    }
  },
  removeItem(e) {
    const items = this.data.items
    items.splice(e.currentTarget.dataset.idx, 1)
    this.setData({ items })
    this.calcTotal()
  },
  calcTotal() {
    const total = this.data.items.reduce((s, i) => s + i.qty * i.unit_price, 0)
    const totalQty = this.data.items.reduce((s, i) => s + i.qty, 0)
    this.setData({ totalAmount: util.formatMoney(total), totalQty })
  },

  onRemarkInput(e) { this.setData({ remark: e.detail }) },

  // --- Submit ---
  submit() {
    if (!this.data.supplierId) { wx.showToast({ title: '请选择进货商', icon: 'none' }); return }
    if (!this.data.items.length) { wx.showToast({ title: '请添加商品', icon: 'none' }); return }
    this.setData({ submitting: true })
    request('/api/purchase-orders', 'POST', {
      supplier_id: this.data.supplierId,
      items: this.data.items.map(i => ({ product_id: i.product_id, qty: i.qty, unit_price: i.unit_price })),
      remark: this.data.remark
    }).then(() => {
      wx.showToast({ title: '入库成功', icon: 'success' })
      this.setData({ items: [], totalAmount: '0.00', totalQty: 0, remark: '', submitting: false })
    }).catch(() => this.setData({ submitting: false }))
  }
})
