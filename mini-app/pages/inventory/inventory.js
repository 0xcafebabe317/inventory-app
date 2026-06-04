const request = require('../../utils/request').default
const util = require('../../utils/util')
const auth = require('../../utils/auth')
const app = getApp()

Page({
  data: {
    products: [],
    search: '',
    page: 1,
    total: 0,
    loading: false,
    hasMore: true
  },

  onShow() {
    if (!auth.checkAuth()) { wx.reLaunch({ url: '/pages/login/login' }); return }
    if (app.isLocked()) {
      wx.redirectTo({ url: '/pages/lock/lock' })
      return
    }
    this.setData({ page: 1, products: [], hasMore: true })
    this.loadProducts()
  },

  onPullDownRefresh() {
    this.setData({ page: 1, products: [], hasMore: true })
    this.loadProducts().then(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    this.loadMore()
  },

  loadMore() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadProducts()
    }
  },

  loadProducts() {
    this.setData({ loading: true })
    const { page, search } = this.data
    let params = { page, page_size: 20 }
    if (search) params.search = search

    return request('/api/products', 'GET', params).then(res => {
      const list = (res.data.list || []).map(p => ({
        ...p,
        sale_price_fmt: util.formatMoney(p.sale_price),
        supplier_name: p.supplier ? p.supplier.name : '',
        stock_warn: p.min_stock > 0 && p.stock_qty <= p.min_stock
      }))
      const products = page === 1 ? list : [...this.data.products, ...list]
      this.setData({
        products,
        total: res.data.total || 0,
        hasMore: products.length < (res.data.total || 0),
        page: page + 1,
        loading: false
      })
    }).catch(() => this.setData({ loading: false }))
  },

  onSearch(e) {
    this.setData({ search: e.detail, page: 1, products: [], hasMore: true })
    this.loadProducts()
  },

  onClear() {
    this.setData({ search: '', page: 1, products: [], hasMore: true })
    this.loadProducts()
  },

  addProduct() {
    wx.navigateTo({ url: '/pages/product-form/product-form' })
  },

  editProduct(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/product-form/product-form?id=${id}` })
  },

  goToStockLog(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/stock-log/stock-log?id=${id}` })
  }
})
