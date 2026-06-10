const api = require('../../utils/api')
const app = getApp()

Page({
  data: {
    suppliers: [],
    showDialog: false,
    dialogTitle: '新增进货商',
    editingId: null,
    form: { name: '', contact_name: '', phone: '', remark: '' },
    submitting: false
  },

  onShow() {
    if (app.isLocked()) { wx.redirectTo({ url: '/pages/lock/lock' }); return }
    this.loadData()
  },

  loadData() {
    api.getSuppliers().then(res => {
      this.setData({ suppliers: res.data || [] })
    }).catch(() => {})
  },

  // --- Add/Edit ---
  showAdd() {
    this.setData({
      editingId: null,
      dialogTitle: '新增进货商',
      form: { name: '', contact_name: '', phone: '', remark: '' },
      showDialog: true
    })
  },
  showEdit(e) {
    const s = e.currentTarget.dataset.supplier
    this.setData({
      editingId: s.id,
      dialogTitle: '编辑进货商',
      form: { name: s.name || '', contact_name: s.contact_name || '', phone: s.phone || '', remark: s.remark || '' },
      showDialog: true
    })
  },
  closeDialog() { this.setData({ showDialog: false }) },

  onNameInput(e) { this.setData({ 'form.name': e.detail }) },
  onContactInput(e) { this.setData({ 'form.contact_name': e.detail }) },
  onPhoneInput(e) { this.setData({ 'form.phone': e.detail }) },
  onRemarkInput(e) { this.setData({ 'form.remark': e.detail }) },

  handleSubmit() {
    if (!this.data.form.name) { wx.showToast({ title: '请输入进货商名称', icon: 'none' }); return }
    this.setData({ submitting: true })
    const data = {
      name: this.data.form.name,
      contact_name: this.data.form.contact_name || '',
      phone: this.data.form.phone || '',
      remark: this.data.form.remark || ''
    }
    const req = this.data.editingId
      ? api.updateSupplier(this.data.editingId, data)
      : api.createSupplier(data)

    req.then(() => {
      wx.showToast({ title: this.data.editingId ? '已更新' : '已添加', icon: 'success' })
      this.setData({ showDialog: false, submitting: false })
      this.loadData()
    }).catch(() => {
      wx.showToast({ title: '操作失败，请重试', icon: 'none' })
      this.setData({ submitting: false })
    })
  },

  goTransactions(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/supplier-transactions/supplier-transactions?id=' + id })
  }
})
