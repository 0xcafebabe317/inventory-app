Page({
  data: {
    showQr: false
  },

  showAdminQr() {
    this.setData({ showQr: true })
  },

  previewQr() {
    wx.previewImage({
      urls: ['/assets/admin-qr.png'],
      current: '/assets/admin-qr.png'
    })
  }
})
