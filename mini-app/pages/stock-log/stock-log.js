const request = require('../../utils/request').default
const util = require('../../utils/util')

Page({
  data: { id: '', logs: [], page: 1, hasMore: true, loading: false },

  onLoad(options) {
    this.setData({ id: options.id })
    this.loadLogs()
  },

  onReachBottom() {
    this.loadMore()
  },

  loadMore() {
    if (this.data.hasMore && !this.data.loading) this.loadLogs()
  },

  loadLogs() {
    this.setData({ loading: true })
    request(`/api/products/${this.data.id}/stock-log`, 'GET', { page: this.data.page }).then(res => {
      const list = (res.data.list || []).map(l => ({
        ...l,
        type_label: l.type === 'in' ? '入库' : l.type === 'out' ? '出库' : '退货回退',
        created_at_fmt: util.formatDateTime(l.created_at)
      }))
      const logs = this.data.page === 1 ? list : [...this.data.logs, ...list]
      this.setData({
        logs,
        hasMore: list.length >= 20,
        page: this.data.page + 1,
        loading: false
      })
    }).catch(() => this.setData({ loading: false }))
  }
})
