const request = require('../../utils/request').default
const util = require('../../utils/util')
const auth = require('../../utils/auth')
const app = getApp()

Page({
  data: {
    todaySales: 0,
    todayProfit: 0,
    monthSales: 0,
    monthProfit: 0,
    totalAr: 0,
    lowStockCount: 0,
    recentSales: [],
    customersWithDebt: [],
    trialDaysLeft: 0,
    loading: true
  },

  onShow() {
    if (!auth.checkAuth()) { wx.reLaunch({ url: '/pages/login/login' }); return }
    if (app.isLocked()) {
      wx.redirectTo({ url: '/pages/lock/lock' })
      return
    }
    this.loadData()
  },

  onPullDownRefresh() {
    this.loadData().then(() => wx.stopPullDownRefresh())
  },

  loadData() {
    this.setData({ loading: true })
    const sub = app.globalData.subscription
    this.setData({ trialDaysLeft: sub.trialDaysLeft || 0 })

    return Promise.all([
      request('/api/reports/summary', 'GET'),
      request('/api/customers', 'GET')
    ]).then(([summary, customers]) => {
      const s = summary.data
      this.setData({
        todaySales: util.formatMoney(s.today_sales),
        todayProfit: util.formatMoney(s.today_profit),
        monthSales: util.formatMoney(s.month_sales),
        monthProfit: util.formatMoney(s.month_profit),
        totalAr: util.formatMoney(s.total_ar),
        lowStockCount: s.low_stock_count,
        recentSales: (s.recent_sales || []).map(o => ({
          ...o,
          total_amount_fmt: util.formatMoney(o.total_amount),
          created_at_fmt: util.formatDate(o.created_at),
          customer_name: o.customer ? o.customer.name : '散客'
        })),
        customersWithDebt: (customers.data || [])
          .filter(c => c.balance > 0)
          .sort((a, b) => b.balance - a.balance)
          .map(c => ({ ...c, balance_fmt: util.formatMoney(c.balance) })),
        loading: false
      })
    }).catch(() => {
      this.setData({ loading: false })
    })
  },

  goToCustomer(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/customer-detail/customer-detail?id=${id}` })
  },

  goToSaleDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/sale-detail/sale-detail?id=${id}` })
  },

  goToInventory() {
    wx.switchTab({ url: '/pages/inventory/inventory' })
  },

  goToTodaySales() {
    wx.navigateTo({ url: '/pages/today-sales/today-sales' })
  }
})
