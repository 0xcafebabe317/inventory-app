Page({
  data: {
    qrcodeUrl: '' // 管理员微信二维码
  },
  onLoad() {
    // In production, fetch QR code URL from backend or use hardcoded image
  },
  saveQrCode() {
    wx.showToast({ title: '请截屏保存二维码', icon: 'none' })
  }
})
