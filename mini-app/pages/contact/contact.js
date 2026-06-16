Page({
  data: {
    fromForgotPassword: false
  },

  onLoad(options) {
    if (options && options.from === 'forgot-password') {
      this.setData({ fromForgotPassword: true })
      wx.setNavigationBarTitle({ title: '忘记密码' })
    }
  },

  previewQrCode() {
    wx.previewImage({
      urls: ['/assets/admin-qr.png'],
      current: '/assets/admin-qr.png'
    })
  }
})
