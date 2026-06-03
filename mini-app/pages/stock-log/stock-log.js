const request = require('../../utils/request').default
const util = require('../../utils/util')

Page({
  data: { id: '', logs: [], page: 1, hasMore: true, loading: false },

  onLoad(options) {
    this.setData({ id: options.id })
    this.loadLogs()
  },

  loadLogs() {
    this.setData({ loading: true })
    request(`/api/products/${this.data.id}/stock-log?page=${this.data.page}`, 'GET').then(res => {
      const list = res.data.list.map(l => ({
        ...l,
        type_label: l.type === 'in' ? '入库' : l.type === 'out' ? '出库' : '退货回退',
        type_class: l.type === 'in' ? 'text-success' : l.type === 'out' ? 'text-danger' : 'text-primary',
        created_at_fmt: util.formatDateTime(l.created_at)
      }))
      this.setData({
        logs: this.data.page === 1 ? list : [...this.data.logs, ...list],
        hasMore: this.data.logs.length + list.length < res.data.total,
        page: this.data.page + 1,
        loading: false
      })
    }).catch(() => this.setData({ loading: false }))
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) this.loadLogs()
  }
})
