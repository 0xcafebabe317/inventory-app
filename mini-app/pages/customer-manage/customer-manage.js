const api = require('../../utils/api')
const util = require('../../utils/util')
const app = getApp()

Page({
  data: {
    customers: [],
    showDialog: false,
    dialogTitle: '新增客户',
    editingId: null,
    form: { name: '', phone: '', wechat: '', remark: '' },
    submitting: false
  },

  onShow() {
    if (app.isLocked()) { wx.redirectTo({ url: '/pages/lock/lock' }); return }
    this.loadData()
  },

  loadData() {
    api.getCustomers().then(res => {
      this.setData({ customers: (res.data || []).map(c => ({ ...c, balance_fmt: util.formatMoney(c.balance || 0) })) })
    }).catch(() => {})
  },

  // --- Add/Edit ---
  showAdd() {
    this.setData({
      editingId: null,
      dialogTitle: '新增客户',
      form: { name: '', phone: '', wechat: '', remark: '' },
      showDialog: true
    })
  },
  showEdit(e) {
    const c = e.currentTarget.dataset.customer
    this.setData({
      editingId: c.id,
      dialogTitle: '编辑客户',
      form: { name: c.name || '', phone: c.phone || '', wechat: c.wechat || '', remark: c.remark || '' },
      showDialog: true
    })
  },
  closeDialog() { this.setData({ showDialog: false }) },

  onNameInput(e) { this.setData({ 'form.name': e.detail }) },
  onPhoneInput(e) { this.setData({ 'form.phone': e.detail }) },
  onWechatInput(e) { this.setData({ 'form.wechat': e.detail }) },
  onRemarkInput(e) { this.setData({ 'form.remark': e.detail }) },

  handleSubmit() {
    if (!this.data.form.name) { wx.showToast({ title: '请输入客户名称', icon: 'none' }); return }
    this.setData({ submitting: true })
    const data = {
      name: this.data.form.name,
      phone: this.data.form.phone || '',
      wechat: this.data.form.wechat || '',
      remark: this.data.form.remark || ''
    }
    const req = this.data.editingId
      ? api.updateCustomer(this.data.editingId, data)
      : api.createCustomer(data)

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
    wx.navigateTo({ url: '/pages/customer-transactions/customer-transactions?id=' + id })
  }
})
