const request = require('../../utils/request').default
const util = require('../../utils/util')

Page({
  data: {
    id: '',
    customer: {},
    totalCredit: '0.00',
    totalRepaid: '0.00',
    balance: '0.00',
    transactions: [],
    showRepayDialog: false,
    repayAmount: '',
    repayMethod: 'wechat',
    submitting: false
  },

  onLoad(options) {
    this.setData({ id: options.id })
    this.loadData()
  },

  onShow() {
    if (this.data.id) this.loadData()
  },

  loadData() {
    request(`/api/customers/${this.data.id}/ledger`, 'GET').then(res => {
      const d = res.data
      this.setData({
        customer: d.customer,
        totalCredit: util.formatMoney(d.total_credit),
        totalRepaid: util.formatMoney(d.total_repaid),
        balance: util.formatMoney(d.balance),
        transactions: (d.transactions || []).map(t => ({
          ...t,
          amount_fmt: util.formatMoney(t.amount),
          type_label: t.type === 'sale' ? '赊账出库' : '还款',
          type_class: t.type === 'sale' ? 'text-danger' : 'text-success'
        }))
      })
    })
  },

  showRepay() {
    this.setData({ showRepayDialog: true, repayAmount: '' })
  },

  submitRepay() {
    const amount = parseFloat(this.data.repayAmount)
    if (!amount || amount <= 0) {
      wx.showToast({ title: '请输入金额', icon: 'none' })
      return
    }
    this.setData({ submitting: true })
    request('/api/repayments', 'POST', {
      customer_id: parseInt(this.data.id),
      amount,
      pay_method: this.data.repayMethod
    }).then(() => {
      wx.showToast({ title: '还款记录成功', icon: 'success' })
      this.setData({ showRepayDialog: false, submitting: false })
      this.loadData()
    }).catch(() => this.setData({ submitting: false }))
  },

  generateLedger() {
    wx.showToast({ title: '请截图当前页面作为对账单', icon: 'none' })
  }
})
