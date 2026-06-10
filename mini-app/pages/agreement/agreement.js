Page({
  data: {
    type: 'service', // 'service' or 'privacy'
    title: ''
  },

  onLoad(options) {
    const type = options.type || 'service'
    const titles = {
      service: '用户服务协议',
      privacy: '隐私政策'
    }
    this.setData({ type, title: titles[type] || '用户服务协议' })
    wx.setNavigationBarTitle({ title: this.data.title })
  }
})
