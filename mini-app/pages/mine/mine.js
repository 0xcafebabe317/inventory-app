const app = getApp()
const util = require('../../utils/util')
const auth = require('../../utils/auth')
const request = require('../../utils/request').default

Page({
  data: {
    userInfo: {},
    phone: '',
    subscriptionStatus: '',
    subscriptionPlan: '',
    trialDaysLeft: 0
  },

  onShow() {
    const g = app.globalData
    this.setData({
      userInfo: g.userInfo || {},
      phone: util.formatPhone(g.phone),
      subscriptionStatus: util.subscriptionStatusLabel(g.subscription.status),
      subscriptionPlan: g.subscription.plan || '',
      trialDaysLeft: g.subscription.trialDaysLeft || 0
    })
  },

  goToSuppliers() {
    // Navigate to supplier management - inline for now
    wx.showToast({ title: '供应商管理开发中', icon: 'none' })
  },

  exportProducts() {
    wx.showLoading({ title: '导出中...' })
    request('/api/export/products', 'GET').finally(() => wx.hideLoading())
  },

  exportSales() {
    wx.showLoading({ title: '导出中...' })
    request('/api/export/sales', 'GET').finally(() => wx.hideLoading())
  },

  goToContact() {
    wx.navigateTo({ url: '/pages/contact/contact' })
  },

  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出吗？退出后需重新登录。',
      success(res) {
        if (res.confirm) {
          auth.logout()
          wx.reLaunch({ url: '/pages/index/index' })
        }
      }
    })
  }
})
