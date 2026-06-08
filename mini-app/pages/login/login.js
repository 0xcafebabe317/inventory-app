const auth = require('../../utils/auth')
const app = getApp()

Page({
  data: {
    phone: '',
    password: '',
    submitting: false
  },

  onLoad() {
    // 已登录直接跳转
    if (auth.checkAuth() && !app.isLocked()) {
      wx.switchTab({ url: '/pages/index/index' })
    }
  },

  onPhoneInput(e) { this.setData({ phone: e.detail }) },
  onPasswordInput(e) { this.setData({ password: e.detail }) },

  handleLogin() {
    const { phone, password } = this.data
    if (!phone) { wx.showToast({ title: '请输入手机号', icon: 'none' }); return }
    if (!/^1\d{10}$/.test(phone)) { wx.showToast({ title: '手机号格式不正确', icon: 'none' }); return }
    if (!password) { wx.showToast({ title: '请输入密码', icon: 'none' }); return }
    if (password.length < 8) { wx.showToast({ title: '密码至少8位', icon: 'none' }); return }

    this.setData({ submitting: true })
    auth.phoneLogin(phone, password).then(data => {
      app.globalData.userInfo = data.user || null
      app.globalData.phone = phone
      app.globalData.subscription = {
        status: data.user?.subscription_status || 'trial',
        plan: data.user?.subscription_plan || null,
        expiresAt: data.user?.subscription_expires_at || null,
        trialDaysLeft: data.trial_days_left || 0
      }
      wx.showToast({ title: '登录成功', icon: 'success' })
      setTimeout(() => wx.switchTab({ url: '/pages/index/index' }), 500)
    }).catch(err => {
      const msg = err && err.message === 'NETWORK_ERROR'
        ? '网络连接失败，请检查网络'
        : '登录失败，请检查手机号或密码'
      wx.showToast({ title: msg, icon: 'none' })
    }).finally(() => {
      this.setData({ submitting: false })
    })
  },

  goRegister() {
    wx.navigateTo({ url: '/pages/register/register' })
  }
})
