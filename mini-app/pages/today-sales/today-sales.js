const api = require('../../utils/api')
const util = require('../../utils/util')
const app = getApp()

Page({
  data: {
    sales: [],
    page: 1,
    loading: false,
    hasMore: true
  },

  onLoad() {
    if (app.isLocked()) { wx.redirectTo({ url: '/pages/lock/lock' }); return }
    this.loadData()
  },

  loadData() {
    if (this.data.loading || !this.data.hasMore) return
    this.setData({ loading: true })
    const today = new Date()
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    api.getSales({ page: this.data.page, page_size: 20, start_date: dateStr, end_date: dateStr }).then(res => {
      const list = (res.data.list || []).map(s => ({
        ...s,
        total_amount_fmt: util.formatMoney(s.total_amount),
        created_at_fmt: util.formatDate(s.created_at),
        customer_name: s.customer ? s.customer.name : '散客',
        item_count: s.items ? s.items.length : 0,
        total_qty: s.items ? s.items.reduce((sum, i) => sum + i.qty, 0) : 0
      }))
      const sales = this.data.page === 1 ? list : [...this.data.sales, ...list]
      this.setData({
        sales,
        hasMore: list.length >= 20,
        page: this.data.page + 1,
        loading: false
      })
    }).catch(() => this.setData({ loading: false }))
  },

  onReachBottom() {
    this.loadMore()
  },

  loadMore() {
    this.loadData()
  },

  goToDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/sale-detail/sale-detail?id=${id}` })
  }
})
