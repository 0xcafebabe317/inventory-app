const request = require('../../utils/request').default
const util = require('../../utils/util')

Page({
  data: {
    suppliers: [],
    supplierId: null,
    supplierName: '',
    items: [],
    totalAmount: '0.00',
    paidAmount: '',
    remark: '',
    submitting: false,
    showSupplierPicker: false,
    showProductPicker: false,
    productSearch: '',
    products: []
  },

  onShow() {
    request('/api/suppliers', 'GET').then(res => {
      this.setData({ suppliers: res.data || [] })
    }).catch(() => {})
  },

  selectSupplier(e) {
    const s = e.currentTarget.dataset.supplier
    this.setData({ supplierId: s.id, supplierName: s.name, showSupplierPicker: false })
  },

  onScan() {
    wx.scanCode({ onlyFromCamera: true, scanType: ['barCode'] })
      .then(res => request('/api/products?search=' + res.result, 'GET'))
      .then(res => {
        if (res.data.list && res.data.list.length > 0) {
          this.addItem(res.data.list[0])
        }
      })
      .catch(() => {})
  },

  onSearchInput(e) {
    const val = e.detail.value
    this.setData({ productSearch: val })
    if (val) {
      request('/api/products?search=' + val + '&page_size=10', 'GET').then(res => {
        this.setData({ products: res.data.list || [], showProductPicker: true })
      })
    }
  },

  selectProduct(e) {
    this.addItem(e.currentTarget.dataset.product)
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
        unit_price: product.purchase_price,
        qty: 1,
        subtotal_fmt: util.formatMoney(product.purchase_price)
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

  removeItem(e) {
    const items = this.data.items
    items.splice(e.currentTarget.dataset.idx, 1)
    this.setData({ items })
    this.calcTotal()
  },

  calcTotal() {
    const total = this.data.items.reduce((s, i) => s + i.qty * i.unit_price, 0)
    this.setData({ totalAmount: util.formatMoney(total) })
  },

  submit() {
    if (!this.data.supplierId) { wx.showToast({ title: '请选择供应商', icon: 'none' }); return }
    if (this.data.items.length === 0) { wx.showToast({ title: '请添加商品', icon: 'none' }); return }

    this.setData({ submitting: true })
    request('/api/purchase-orders', 'POST', {
      supplier_id: this.data.supplierId,
      items: this.data.items.map(i => ({
        product_id: i.product_id, qty: i.qty, unit_price: i.unit_price
      })),
      paid_amount: parseFloat(this.data.paidAmount) || 0,
      remark: this.data.remark
    }).then(() => {
      wx.showToast({ title: '入库成功', icon: 'success' })
      this.setData({ items: [], totalAmount: '0.00', paidAmount: '', remark: '', submitting: false })
    }).catch(() => this.setData({ submitting: false }))
  }
})
