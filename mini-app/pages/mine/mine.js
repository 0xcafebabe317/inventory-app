const app = getApp()
const util = require('../../utils/util')
const auth = require('../../utils/auth')
const api = require('../../utils/api')

Page({
  data: {
    userInfo: {},
    nickname: '',
    subscriptionStatus: '',
    subscriptionPlan: '',
    trialDaysLeft: 0,
    expiryDisplay: '',
    expiryClass: '',
    uploadingAvatar: false,
    nicknameChangedAt: '',

    // Edit nickname
    showNicknameDialog: false,
    nicknameForm: '',
    nicknameLoading: false,
    canChangeNickname: true,
    nextChangeDate: '',

    // Change password
    showPwdDialog: false,
    pwdForm: { oldPassword: '', newPassword: '', confirmPassword: '' },
    pwdLoading: false
  },

  onShow() {
    if (!auth.checkAuth()) { wx.reLaunch({ url: '/pages/login/login' }); return }
    const g = app.globalData
    const user = g.userInfo || {}

    // 计算到期显示（中文格式）
    const expiry = util.formatExpiry({
      subscription_expires_at: user.subscription_expires_at,
      subscription_status: user.subscription_status,
      created_at: user.created_at
    })

    // 处理头像URL（相对路径转绝对路径）
    const userInfo = { ...user }
    if (userInfo.avatar_url) {
      userInfo.avatar_url = util.fullUrl(userInfo.avatar_url)
    }

    // 计算昵称修改限制
    let canChangeNickname = true
    let nextChangeDate = ''
    if (user.nickname_changed_at) {
      const changedAt = new Date(user.nickname_changed_at)
      const nextChange = new Date(changedAt)
      nextChange.setMonth(nextChange.getMonth() + 6)
      const now = new Date()
      if (nextChange > now) {
        canChangeNickname = false
        nextChangeDate = `${nextChange.getFullYear()}-${String(nextChange.getMonth() + 1).padStart(2, '0')}-${String(nextChange.getDate()).padStart(2, '0')}`
      }
    }

    this.setData({
      userInfo,
      nickname: g.nickname || user.nickname || '',
      subscriptionStatus: util.subscriptionStatusLabel(g.subscription.status),
      subscriptionPlan: g.subscription.plan || '',
      trialDaysLeft: g.subscription.trialDaysLeft || 0,
      expiryDisplay: expiry.display,
      expiryClass: expiry.cssClass,
      nicknameChangedAt: user.nickname_changed_at || '',
      canChangeNickname,
      nextChangeDate
    })
  },

  // --- Copy Nickname ---
  copyNickname() {
    util.copyText(this.data.nickname)
  },

  // --- Avatar Upload ---
  chooseAvatar() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({ uploadingAvatar: true })
        wx.uploadFile({
          url: 'https://www.tzjxc.online/api/upload/avatar',
          filePath: res.tempFilePaths[0],
          name: 'file',
          header: { 'Authorization': `Bearer ${wx.getStorageSync('access_token')}` },
          success: (uploadRes) => {
            try {
              const data = JSON.parse(uploadRes.data)
              if (data.code === 'OK' && data.data.url) {
                // Update local profile
                const avatarUrl = util.fullUrl(data.data.url)
                api.updateProfile({ avatar_url: data.data.url }).then(() => {
                  const user = this.data.userInfo
                  user.avatar_url = avatarUrl
                  app.globalData.userInfo = user
                  this.setData({ userInfo: user })
                  wx.showToast({ title: '头像更新成功', icon: 'success' })
                }).catch(() => {})
              }
            } catch { wx.showToast({ title: '上传失败', icon: 'none' }) }
          },
          fail: () => { wx.showToast({ title: '上传失败', icon: 'none' }) },
          complete: () => { this.setData({ uploadingAvatar: false }) }
        })
      }
    })
  },

  // --- Edit Nickname ---
  openNicknameDialog() {
    if (!this.data.canChangeNickname) {
      wx.showToast({ title: '昵称每半年只能改一次，下次可改：' + this.data.nextChangeDate, icon: 'none', duration: 3000 })
      return
    }
    this.setData({ nicknameForm: this.data.userInfo.nickname || '', showNicknameDialog: true })
  },
  onNicknameInput(e) { this.setData({ nicknameForm: e.detail }) },
  closeNicknameDialog() { this.setData({ showNicknameDialog: false }) },
  handleUpdateNickname() {
    if (!this.data.nicknameForm) { wx.showToast({ title: '请输入昵称', icon: 'none' }); return }
    this.setData({ nicknameLoading: true })
    api.updateProfile({ nickname: this.data.nicknameForm }).then((res) => {
      const user = this.data.userInfo
      user.nickname = this.data.nicknameForm
      user.nickname_changed_at = new Date().toISOString()
      app.globalData.userInfo = user
      app.globalData.nickname = this.data.nicknameForm
      this.setData({
        userInfo: user,
        nickname: this.data.nicknameForm,
        showNicknameDialog: false,
        canChangeNickname: false,
        nicknameChangedAt: user.nickname_changed_at
      })
      wx.showToast({ title: '昵称修改成功', icon: 'success' })
    }).catch((err) => {
      const msg = (err && err.data && err.data.message) || '修改失败'
      wx.showToast({ title: msg, icon: 'none' })
    }).finally(() => this.setData({ nicknameLoading: false }))
  },

  // --- Change Password ---
  openPwdDialog() {
    this.setData({ pwdForm: { oldPassword: '', newPassword: '', confirmPassword: '' }, showPwdDialog: true })
  },
  onOldPwdInput(e) { this.setData({ 'pwdForm.oldPassword': e.detail }) },
  onNewPwdInput(e) { this.setData({ 'pwdForm.newPassword': e.detail }) },
  onConfirmPwdInput(e) { this.setData({ 'pwdForm.confirmPassword': e.detail }) },
  closePwdDialog() { this.setData({ showPwdDialog: false }) },
  handleChangePwd() {
    const { oldPassword, newPassword, confirmPassword } = this.data.pwdForm
    if (!oldPassword || !newPassword) { wx.showToast({ title: '请填写完整', icon: 'none' }); return }
    if (newPassword.length < 8) { wx.showToast({ title: '新密码至少8位', icon: 'none' }); return }
    if (newPassword !== confirmPassword) { wx.showToast({ title: '两次密码不一致', icon: 'none' }); return }
    this.setData({ pwdLoading: true })
    api.changePassword(oldPassword, newPassword).then(() => {
      wx.showToast({ title: '密码修改成功', icon: 'success' })
      this.setData({ showPwdDialog: false })
    }).catch(() => {}).finally(() => this.setData({ pwdLoading: false }))
  },

  // --- Navigation ---
  goToSuppliers() { wx.navigateTo({ url: '/pages/supplier-manage/supplier-manage' }) },
  goToCustomers() { wx.navigateTo({ url: '/pages/customer-manage/customer-manage' }) },
  goToContact() { wx.navigateTo({ url: '/pages/contact/contact' }) },

  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出吗？',
      success(res) {
        if (res.confirm) {
          auth.logout()
          wx.reLaunch({ url: '/pages/login/login' })
        }
      }
    })
  }
})
