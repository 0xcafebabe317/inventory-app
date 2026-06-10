const request = require('../../utils/request').default

Page({
  data: {
    id: null,
    form: {
      name: '', spec: '', unit: '',
      sale_price: '', wholesale_price: '', purchase_price: '', min_stock: '',
      supplier_id: null
    },
    supplierName: '',
    suppliers: [],
    showSupplierPicker: false,
    submitting: false,
    isEdit: false
  },

  onLoad(options) {
    this.loadSuppliers()
    if (options.id) {
      this.setData({ id: options.id, isEdit: true })
      this.loadProduct(options.id)
    }
  },

  loadSuppliers() {
    request('/api/suppliers', 'GET').then(res => {
      this.setData({ suppliers: res.data || [] })
    }).catch(() => {})
  },

  loadProduct(id) {
    request('/api/products', 'GET', { page_size: 500 }).then(res => {
      const p = (res.data.list || []).find(item => item.id == id)
      if (p) {
        this.setData({
          form: {
            name: p.name, spec: p.spec || '',
            unit: p.unit || '', sale_price: String(p.sale_price || ''),
            wholesale_price: String(p.wholesale_price || ''),
            purchase_price: String(p.purchase_price || ''), min_stock: String(p.min_stock || ''),
            supplier_id: p.supplier_id || null
          },
          supplierName: p.supplier ? p.supplier.name : ''
        })
      }
    })
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`form.${field}`]: e.detail })
  },

  // --- Supplier Picker ---
  openSupplierPicker() { this.setData({ showSupplierPicker: true }) },
  closeSupplierPicker() { this.setData({ showSupplierPicker: false }) },
  selectSupplier(e) {
    const s = e.currentTarget.dataset.supplier
    this.setData({
      'form.supplier_id': s.id,
      supplierName: s.name,
      showSupplierPicker: false
    })
  },

  submit() {
    const f = this.data.form
    if (!f.name) { wx.showToast({ title: '请输入商品名称', icon: 'none' }); return }

    this.setData({ submitting: true })
    const data = {
      name: f.name, spec: f.spec || '', unit: f.unit || '',
      sale_price: parseFloat(f.sale_price) || 0,
      wholesale_price: parseFloat(f.wholesale_price) || 0,
      purchase_price: parseFloat(f.purchase_price) || 0,
      min_stock: parseInt(f.min_stock) || 0,
      supplier_id: f.supplier_id || null
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
