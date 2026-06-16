const auth = require('../../utils/auth')
const app = getApp()

Page({
  data: {
    nickname: '',
    password: '',
    showPassword: false,
    submitting: false,
    agreed: false
  },

  onLoad() {
    // 已登录直接跳转
    if (auth.checkAuth() && !app.isLocked()) {
      wx.switchTab({ url: '/pages/index/index' })
    }
  },

  onNicknameInput(e) { this.setData({ nickname: e.detail }) },
  onPasswordInput(e) { this.setData({ password: e.detail }) },
  togglePassword() { this.setData({ showPassword: !this.data.showPassword }) },

  handleLogin() {
    const { nickname, password } = this.data
    if (!nickname) { wx.showToast({ title: '请输入昵称', icon: 'none' }); return }
    if (!password) { wx.showToast({ title: '请输入密码', icon: 'none' }); return }
    if (password.length < 8) { wx.showToast({ title: '密码至少8位', icon: 'none' }); return }

    this.setData({ submitting: true })
    auth.nicknameLogin(nickname, password).then(data => {
      app.globalData.userInfo = data.user || null
      app.globalData.nickname = nickname
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
        : '登录失败，请检查昵称或密码'
      wx.showToast({ title: msg, icon: 'none' })
    }).finally(() => {
      this.setData({ submitting: false })
    })
  },

  onAgreeChange(e) {
    this.setData({ agreed: e.detail })
  },

  viewAgreement(e) {
    const type = e.currentTarget.dataset.type
    wx.navigateTo({ url: '/pages/agreement/agreement?type=' + type })
  },

  goRegister() {
    wx.navigateTo({ url: '/pages/register/register' })
  }
})
