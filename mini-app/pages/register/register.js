const auth = require('../../utils/auth')
const app = getApp()

Page({
  data: {
    nickname: '',
    password: '',
    confirmPassword: '',
    submitting: false,
    agreed: false
  },

  onNicknameInput(e) { this.setData({ nickname: e.detail }) },
  onPasswordInput(e) { this.setData({ password: e.detail }) },
  onConfirmInput(e) { this.setData({ confirmPassword: e.detail }) },

  handleRegister() {
    const { nickname, password, confirmPassword } = this.data
    if (!nickname) { wx.showToast({ title: '请输入昵称', icon: 'none' }); return }
    if (nickname.length < 2) { wx.showToast({ title: '昵称至少2个字符', icon: 'none' }); return }
    if (!password) { wx.showToast({ title: '请输入密码', icon: 'none' }); return }
    if (password.length < 8) { wx.showToast({ title: '密码至少8位', icon: 'none' }); return }
    if (password !== confirmPassword) { wx.showToast({ title: '两次密码不一致', icon: 'none' }); return }

    this.setData({ submitting: true })
    auth.nicknameRegister(nickname, password).then(data => {
      app.globalData.userInfo = data.user || null
      app.globalData.nickname = nickname
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

  onAgreeChange(e) {
    this.setData({ agreed: e.detail })
  },

  viewAgreement(e) {
    const type = e.currentTarget.dataset.type
    wx.navigateTo({ url: '/pages/agreement/agreement?type=' + type })
  },

  goLogin() {
    wx.navigateBack()
  }
})
