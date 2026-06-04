const auth = require('../../utils/auth')
const app = getApp()

Page({
  data: {
    phone: '',
    nickname: '',
    password: '',
    confirmPassword: '',
    submitting: false
  },

  onPhoneInput(e) { this.setData({ phone: e.detail }) },
  onNicknameInput(e) { this.setData({ nickname: e.detail }) },
  onPasswordInput(e) { this.setData({ password: e.detail }) },
  onConfirmInput(e) { this.setData({ confirmPassword: e.detail }) },

  handleRegister() {
    const { phone, nickname, password, confirmPassword } = this.data
    if (!phone) { wx.showToast({ title: '请输入手机号', icon: 'none' }); return }
    if (!/^1\d{10}$/.test(phone)) { wx.showToast({ title: '手机号格式不正确', icon: 'none' }); return }
    if (!password) { wx.showToast({ title: '请输入密码', icon: 'none' }); return }
    if (password.length < 6) { wx.showToast({ title: '密码至少6位', icon: 'none' }); return }
    if (password !== confirmPassword) { wx.showToast({ title: '两次密码不一致', icon: 'none' }); return }

    this.setData({ submitting: true })
    const name = nickname || '用户' + phone.slice(-4)
    auth.phoneRegister(phone, password, name).then(data => {
      app.globalData.userInfo = data.user || null
      app.globalData.phone = phone
      app.globalData.subscription = {
        status: 'trial',
        plan: null,
        expiresAt: null,
        trialDaysLeft: 7
      }
      wx.showToast({ title: '注册成功，7天试用已开启', icon: 'success' })
      setTimeout(() => wx.switchTab({ url: '/pages/index/index' }), 800)
    }).catch(err => {
      wx.showToast({ title: '注册失败，请重试', icon: 'none' })
    }).finally(() => {
      this.setData({ submitting: false })
    })
  },

  goLogin() {
    wx.navigateBack()
  }
})
