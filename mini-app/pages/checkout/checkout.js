const request = require('../../utils/request').default
const util = require('../../utils/util')
const auth = require('../../utils/auth')
const app = getApp()

Page({
  data: {
    items: [],
    totalAmount: '0.00',
    totalQty: 0,
    payMethod: 'wechat',
    customerId: null,
    customerName: '',
    customers: [],
    showCustomerPicker: false,
    showProductPicker: false,
    productSearch: '',
    allProducts: [],
    pickerProducts: [],
    submitting: false
  },

  onShow() {
    if (!auth.checkAuth()) { wx.reLaunch({ url: '/pages/login/login' }); return }
    if (app.isLocked()) {
      wx.redirectTo({ url: '/pages/lock/lock' })
      return
    }
  },

  // --- Scan ---
  onScan() {
    wx.scanCode({ onlyFromCamera: true, scanType: ['barCode', 'qrCode'] }).then(res => {
      request('/api/products', 'GET', { search: res.result }).then(r => {
        if (r.data.list && r.data.list.length > 0) {
          this.addItem(r.data.list[0])
        } else {
          wx.showToast({ title: '未找到商品', icon: 'none' })
        }
      }).catch(() => {})
    }).catch(() => {})
  },

  // --- Product Picker ---
  openProductPicker() {
    if (!this.data.allProducts.length) {
      request('/api/products', 'GET', { page_size: 200 }).then(res => {
        const list = (res.data.list || []).map(p => ({
          ...p,
          sale_price_fmt: util.formatMoney(p.sale_price),
          supplier_name: p.supplier ? p.supplier.name : ''
        }))
        this.setData({ allProducts: list, pickerProducts: list, showProductPicker: true })
      }).catch(() => { this.setData({ showProductPicker: true }) })
    } else {
      this.setData({ pickerProducts: this.data.allProducts, showProductPicker: true })
    }
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
  searchProducts(e) {
    this.onPickerSearch(e)
  },
  selectProduct(e) {
    this.addItem(e.currentTarget.dataset.product)
    this.setData({ showProductPicker: false, productSearch: '' })
  },

  // --- Cart ---
  addItem(product) {
    const items = [...this.data.items]
    const idx = items.findIndex(i => i.product_id === product.id)
    if (idx >= 0) {
      items[idx].qty += 1
      items[idx].subtotal_fmt = util.formatMoney(items[idx].qty * items[idx].unit_price)
    } else {
      items.push({
        product_id: product.id,
        name: product.name,
        spec: product.spec || '',
        unit: product.unit || '个',
        unit_price: product.sale_price,
        unit_price_fmt: util.formatMoney(product.sale_price),
        qty: 1,
        subtotal_fmt: util.formatMoney(product.sale_price),
        stock_qty: product.stock_qty || 0
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
    const items = this.data.items
    if (!isNaN(val) && val >= 1) {
      items[idx].qty = Math.min(val, 9999)
      items[idx].subtotal_fmt = util.formatMoney(items[idx].qty * items[idx].unit_price)
      this.setData({ items })
      this.calcTotal()
    }
  },
  onQtyBlur(e) {
    // keep existing qty if invalid - no-op
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

  // --- Customer ---
  openCustomerPicker() {
    request('/api/customers', 'GET').then(res => {
      this.setData({ customers: res.data || [], showCustomerPicker: true })
    }).catch(() => { this.setData({ showCustomerPicker: true }) })
  },
  closeCustomerPicker() { this.setData({ showCustomerPicker: false }) },
  selectCustomer(e) {
    const c = e.currentTarget.dataset.customer
    this.setData({ customerId: c.id, customerName: c.name, showCustomerPicker: false })
  },
  clearCustomer() {
    this.setData({ customerId: null, customerName: '' })
  },

  // --- Payment ---
  selectPayMethod(e) {
    this.setData({ payMethod: e.currentTarget.dataset.method })
  },

  // --- Submit ---
  submit() {
    if (!this.data.items.length) { wx.showToast({ title: '请添加商品', icon: 'none' }); return }
    this.setData({ submitting: true })

    const total = this.data.items.reduce((s, i) => s + i.qty * i.unit_price, 0)
    request('/api/sale-orders', 'POST', {
      customer_id: this.data.customerId || null,
      items: this.data.items.map(i => ({ product_id: i.product_id, qty: i.qty, unit_price: i.unit_price })),
      pay_method: this.data.payMethod,
      paid_amount: total
    }).then(() => {
      wx.showToast({ title: '收款成功', icon: 'success' })
      this.setData({ items: [], totalAmount: '0.00', totalQty: 0, customerId: null, customerName: '', payMethod: 'wechat' })
    }).catch(() => {}).finally(() => this.setData({ submitting: false }))
  },

  goToAddProduct() {
    wx.navigateTo({ url: '/pages/product-form/product-form' })
  }
})
