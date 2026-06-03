const request = require('../../utils/request').default
const util = require('../../utils/util')

Page({
  data: {
    id: null,
    form: {
      name: '', barcode: '', spec: '', unit: '个',
      sale_price: '', purchase_price: '', min_stock: '',
      category: '', image_url: ''
    },
    submitting: false,
    isEdit: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ id: options.id, isEdit: true })
      this.loadProduct(options.id)
    }
  },

  loadProduct(id) {
    request(`/api/products?search=&page_size=100`, 'GET').then(res => {
      const p = (res.data.list || []).find(item => item.id == id)
      if (p) {
        this.setData({
          form: {
            name: p.name, barcode: p.barcode || '', spec: p.spec || '',
            unit: p.unit || '个', sale_price: String(p.sale_price),
            purchase_price: String(p.purchase_price), min_stock: String(p.min_stock || ''),
            category: p.category || '', image_url: p.image_url || ''
          }
        })
      }
    })
  },

  onScan() {
    wx.scanCode({ onlyFromCamera: true, scanType: ['barCode', 'qrCode'] })
      .then(res => this.setData({ 'form.barcode': res.result }))
      .catch(() => {})
  },

  onInput(e) {
    const { field } = e.currentTarget.dataset
    this.setData({ [`form.${field}`]: e.detail.value })
  },

  onChooseImage() {
    wx.chooseImage({ count: 1, sizeType: ['compressed'] })
      .then(res => this.setData({ 'form.image_url': res.tempFilePaths[0] }))
      .catch(() => {})
  },

  submit() {
    const f = this.data.form
    if (!f.name) { wx.showToast({ title: '请输入商品名称', icon: 'none' }); return }

    this.setData({ submitting: true })
    const data = {
      name: f.name, barcode: f.barcode, spec: f.spec, unit: f.unit,
      sale_price: parseFloat(f.sale_price) || 0,
      purchase_price: parseFloat(f.purchase_price) || 0,
      min_stock: parseInt(f.min_stock) || 0,
      category: f.category, image_url: f.image_url
    }

    const req = this.data.isEdit
      ? request(`/api/products/${this.data.id}`, 'PUT', data)
      : request('/api/products', 'POST', data)

    req.then(() => {
      wx.showToast({ title: this.data.isEdit ? '已更新' : '已添加', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1000)
    }).catch(() => this.setData({ submitting: false }))
  }
})
