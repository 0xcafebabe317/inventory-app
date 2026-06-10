const request = require('../../utils/request').default
const util = require('../../utils/util')
const app = getApp()

Page({
  data: {
    purchases: [],
    page: 1,
    loading: false,
    hasMore: true
  },

  onLoad() {
    if (app.isLocked()) { wx.redirectTo({ url: '/pages/lock/lock' }); return }
    this.loadData()
  },

  goBack() { wx.navigateBack() },

  loadData() {
    if (this.data.loading || !this.data.hasMore) return
    this.setData({ loading: true })

    // 最近7天
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const startStr = `${weekAgo.getFullYear()}-${String(weekAgo.getMonth() + 1).padStart(2, '0')}-${String(weekAgo.getDate()).padStart(2, '0')}`

    request('/api/purchase-orders', 'GET', { page: this.data.page, page_size: 20, start_date: startStr }).then(res => {
      const list = (res.data.list || []).map(o => ({
        ...o,
        total_amount_fmt: util.formatMoney(o.total_amount),
        created_at_fmt: util.formatDateTime(o.created_at),
        supplier_name: o.supplier ? o.supplier.name : '未知',
        item_count: o.items ? o.items.length : 0,
        total_qty: o.items ? o.items.reduce((sum, i) => sum + i.qty, 0) : 0
      }))
      const purchases = this.data.page === 1 ? list : [...this.data.purchases, ...list]
      this.setData({
        purchases,
        hasMore: list.length >= 20,
        page: this.data.page + 1,
        loading: false
      })
    }).catch(() => this.setData({ loading: false }))
  },

  onReachBottom() {
    this.loadData()
  },

  goToDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/purchase-detail/purchase-detail?id=${id}` })
  }
})
