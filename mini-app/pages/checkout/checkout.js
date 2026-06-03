const request = require('../../utils/request').default
const util = require('../../utils/util')
const app = getApp()

Page({
  data: {
    items: [],
    totalAmount: '0.00',
    payMethod: 'cash',
    customerId: null,
    customerName: '',
    customers: [],
    paidAmount: '',
    showCustomerPicker: false,
    showProductPicker: false,
    productSearch: '',
    products: [],
    submitting: false
  },

  onShow() {
    if (app.isLocked()) {
      wx.redirectTo({ url: '/pages/lock/lock' })
      return
    }
    this.loadCustomers()
  },

  loadCustomers() {
    request('/api/customers', 'GET').then(res => {
      this.setData({ customers: res.data || [] })
    }).catch(() => {})
  },

  // Scan product barcode
  onScan() {
    wx.scanCode({ onlyFromCamera: true, scanType: ['barCode', 'qrCode'] })
      .then(res => {
        this.searchProductByBarcode(res.result)
      })
      .catch(() => {})
  },

  searchProductByBarcode(barcode) {
    request('/api/products?search=' + barcode, 'GET').then(res => {
      if (res.data.list && res.data.list.length > 0) {
        this.addItem(res.data.list[0])
      } else {
        wx.showToast({ title: '未找到商品', icon: 'none' })
      }
    }).catch(() => {})
  },

  // Search products
  onSearchInput(e) {
    const val = e.detail.value
    this.setData({ productSearch: val })
    if (val) {
      request('/api/products?search=' + val + '&page_size=10', 'GET').then(res => {
        this.setData({ products: res.data.list || [], showProductPicker: true })
      }).catch(() => {})
    }
  },

  selectProduct(e) {
    const product = e.currentTarget.dataset.product
    this.addItem(product)
    this.setData({ showProductPicker: false, productSearch: '' })
  },

  addItem(product) {
    const items = this.data.items
    const idx = items.findIndex(i => i.product_id === product.id)
    if (idx >= 0) {
      items[idx].qty += 1
      items[idx].subtotal_fmt = util.formatMoney(items[idx].qty * items[idx].unit_price)
    } else {
      items.push({
        product_id: product.id,
        name: product.name,
        spec: product.spec,
        unit: product.unit,
        unit_price: product.sale_price,
        unit_price_fmt: util.formatMoney(product.sale_price),
        qty: 1,
        subtotal_fmt: util.formatMoney(product.sale_price),
        stock_qty: product.stock_qty
      })
    }
    this.setData({ items })
    this.calcTotal()
  },

  changeQty(e) {
    const idx = e.currentTarget.dataset.idx
    const delta = parseInt(e.currentTarget.dataset.delta)
    const items = this.data.items
    items[idx].qty = Math.max(1, items[idx].qty + delta)
    items[idx].subtotal_fmt = util.formatMoney(items[idx].qty * items[idx].unit_price)
    this.setData({ items })
    this.calcTotal()
  },

  removeItem(e) {
    const idx = e.currentTarget.dataset.idx
    const items = this.data.items
    items.splice(idx, 1)
    this.setData({ items })
    this.calcTotal()
  },

  calcTotal() {
    const total = this.data.items.reduce((sum, i) => sum + i.qty * i.unit_price, 0)
    this.setData({ totalAmount: util.formatMoney(total) })
  },

  selectPayMethod(e) {
    const method = e.currentTarget.dataset.method
    this.setData({ payMethod: method })
    if (method === 'credit') {
      this.setData({ showCustomerPicker: true })
    } else {
      this.setData({ customerId: null, customerName: '' })
    }
  },

  selectCustomer(e) {
    const cust = e.currentTarget.dataset.customer
    this.setData({
      customerId: cust.id,
      customerName: cust.name,
      showCustomerPicker: false
    })
  },

  onPaidAmountInput(e) {
    this.setData({ paidAmount: e.detail.value })
  },

  // Submit sale order
  submit() {
    if (this.data.items.length === 0) {
      wx.showToast({ title: '请添加商品', icon: 'none' })
      return
    }
    if (this.data.payMethod === 'credit' && !this.data.customerId) {
      wx.showToast({ title: '赊账请选择客户', icon: 'none' })
      return
    }
    this.setData({ submitting: true })

    const total = this.data.items.reduce((s, i) => s + i.qty * i.unit_price, 0)
    const paid = this.data.payMethod === 'cash' ? total : (parseFloat(this.data.paidAmount) || 0)

    request('/api/sale-orders', 'POST', {
      customer_id: this.data.customerId || null,
      items: this.data.items.map(i => ({
        product_id: i.product_id,
        qty: i.qty,
        unit_price: i.unit_price
      })),
      pay_method: this.data.payMethod,
      paid_amount: paid
    }).then(() => {
      wx.showToast({ title: '开单成功', icon: 'success' })
      this.setData({ items: [], totalAmount: '0.00', paidAmount: '', customerId: null, customerName: '', submitting: false })
    }).catch(() => {
      this.setData({ submitting: false })
    })
  },

  // Navigation
  goToPurchase() {
    wx.navigateTo({ url: '/pages/purchase/purchase' })
  },

  goToSales() {
    // Navigate to sales list - use a simple page or show inline
    wx.showToast({ title: '请在首页查看最近销售', icon: 'none' })
  }
})
