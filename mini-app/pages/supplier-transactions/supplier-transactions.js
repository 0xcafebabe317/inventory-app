const request = require('../../utils/request').default
const util = require('../../utils/util')

Page({
  data: {
    supplierId: null,
    orders: [],
    supplier: null,
    loading: false,
    loadingMore: false,
    page: 1,
    total: 0,
    pageSize: 20,
    filterStartDate: '',
    filterEndDate: '',
    filterSearch: '',
    uploadingOrderId: null
  },

  onLoad(options) {
    this.setData({ supplierId: Number(options.id) })
    this.loadTransactions()
  },

  goBack() { wx.navigateBack() },

  onFilterStartDate(e) {
    const val = e.detail.value
    this.setData({ filterStartDate: val })
    this.loadTransactions({ startDate: val })
  },
  onFilterEndDate(e) {
    const val = e.detail.value
    this.setData({ filterEndDate: val })
    this.loadTransactions({ endDate: val })
  },
  onFilterSearchInput(e) {
    const val = e.detail.value
    this.setData({ filterSearch: val })
    clearTimeout(this._searchTimer)
    this._searchTimer = setTimeout(() => this.loadTransactions({ search: val }), 400)
  },
  clearSearch() {
    this.setData({ filterSearch: '' })
    this.loadTransactions({ search: '' })
  },
  clearFilters() {
    this.setData({ filterStartDate: '', filterEndDate: '', filterSearch: '' })
    this.loadTransactions({ startDate: '', endDate: '', search: '' })
  },

  loadTransactions(overrides = {}) {
    this.setData({ loading: true, page: 1 })
    const params = { page: 1, page_size: this.data.pageSize }

    // Use override values if provided, otherwise read from data
    const startDate = overrides.hasOwnProperty('startDate') ? overrides.startDate : this.data.filterStartDate
    const endDate = overrides.hasOwnProperty('endDate') ? overrides.endDate : this.data.filterEndDate
    const search = overrides.hasOwnProperty('search') ? overrides.search : this.data.filterSearch

    if (startDate) params.start_date = startDate
    if (endDate) params.end_date = endDate
    if (search) params.search = search

    request('/api/suppliers/' + this.data.supplierId + '/transactions', 'GET', params).then(res => {
      const list = (res.data.list || []).map(o => ({
        ...o,
        invoice_url: util.fullUrl(o.invoice_url),
        total_amount_fmt: util.formatMoney(o.total_amount),
        created_at_fmt: util.formatDateTime(o.created_at),
        items: (o.items || []).map(item => ({
          ...item,
          unit_price_fmt: util.formatMoney(item.unit_price),
          subtotal_fmt: util.formatMoney(item.subtotal)
        }))
      }))
      this.setData({
        orders: list,
        total: res.data.total || 0,
        supplier: res.data.supplier || null,
        loading: false
      })
    }).catch(() => this.setData({ loading: false }))
  },

  loadMore() {
    if (this.data.loadingMore || this.data.orders.length >= this.data.total) return
    this.setData({ loadingMore: true, page: this.data.page + 1 })
    const params = { page: this.data.page + 1, page_size: this.data.pageSize }
    if (this.data.filterStartDate) params.start_date = this.data.filterStartDate
    if (this.data.filterEndDate) params.end_date = this.data.filterEndDate
    if (this.data.filterSearch) params.search = this.data.filterSearch

    request('/api/suppliers/' + this.data.supplierId + '/transactions', 'GET', params).then(res => {
      const list = (res.data.list || []).map(o => ({
        ...o,
        invoice_url: util.fullUrl(o.invoice_url),
        total_amount_fmt: util.formatMoney(o.total_amount),
        created_at_fmt: util.formatDateTime(o.created_at),
        items: (o.items || []).map(item => ({
          ...item,
          unit_price_fmt: util.formatMoney(item.unit_price),
          subtotal_fmt: util.formatMoney(item.subtotal)
        }))
      }))
      this.setData({
        orders: this.data.orders.concat(list),
        loadingMore: false
      })
    }).catch(() => this.setData({ loadingMore: false }))
  },

  previewInvoice(e) {
    const url = e.currentTarget.dataset.url
    if (url) wx.previewImage({ urls: [url], current: url })
  },

  chooseInvoice(e) {
    const orderId = e.currentTarget.dataset.id
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({ uploadingOrderId: orderId })
        wx.uploadFile({
          url: 'https://www.tzjxc.online/api/upload/invoice',
          filePath: res.tempFilePaths[0],
          name: 'file',
          formData: { type: 'purchase' },
          header: { 'Authorization': 'Bearer ' + wx.getStorageSync('access_token') },
          success: (uploadRes) => {
            try {
              const data = JSON.parse(uploadRes.data)
              if (data.code === 'OK' && data.data.url) {
                request('/api/purchase-orders/' + orderId + '/invoice', 'PUT', { invoice_url: data.data.url }).then(() => {
                  const orders = this.data.orders.map(o => o.id === orderId ? { ...o, invoice_url: util.fullUrl(data.data.url) } : o)
                  this.setData({ orders })
                  wx.showToast({ title: '发票已上传', icon: 'success' })
                }).catch(() => {})
              }
            } catch (e) { wx.showToast({ title: '上传失败', icon: 'none' }) }
          },
          fail: () => { wx.showToast({ title: '上传失败', icon: 'none' }) },
          complete: () => { this.setData({ uploadingOrderId: null }) }
        })
      }
    })
  }
})
