const request = require('../../utils/request').default
const util = require('../../utils/util')
const app = getApp()

Page({
  data: {
    products: [],
    search: '',
    category: '',
    categories: [],
    page: 1,
    total: 0,
    loading: false,
    hasMore: true
  },

  onShow() {
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
    if (this.data.hasMore && !this.data.loading) {
      this.loadProducts()
    }
  },

  loadProducts() {
    this.setData({ loading: true })
    const { page, search, category } = this.data
    let url = `/api/products?page=${page}&page_size=20`
    if (search) url += '&search=' + search
    if (category) url += '&category=' + category

    return request(url, 'GET').then(res => {
      const list = res.data.list.map(p => ({
        ...p,
        sale_price_fmt: util.formatMoney(p.sale_price),
        purchase_price_fmt: util.formatMoney(p.purchase_price),
        stock_warn: p.min_stock > 0 && p.stock_qty <= p.min_stock
      }))
      this.setData({
        products: page === 1 ? list : [...this.data.products, ...list],
        total: res.data.total,
        hasMore: this.data.products.length + list.length < res.data.total,
        page: page + 1,
        loading: false
      })
    }).catch(() => this.setData({ loading: false }))
  },

  onSearch(e) {
    this.setData({ search: e.detail.value, page: 1, products: [] })
    this.loadProducts()
  },

  addProduct() {
    wx.navigateTo({ url: '/pages/product-form/product-form' })
  },

  editProduct(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/product-form/product-form?id=${id}` })
  },

  goToStockCheck() {
    wx.navigateTo({ url: '/pages/stock-check/stock-check' })
  },

  goToStockLog(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/stock-log/stock-log?id=${id}` })
  }
})
