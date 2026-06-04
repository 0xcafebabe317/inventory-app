Page({
  data: {},
  onLoad() {},
  previewQrCode() {
    wx.previewImage({
      urls: ['/assets/admin-qr.png'],
      current: '/assets/admin-qr.png'
    })
  }
})
