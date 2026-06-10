const request = require('../../utils/request').default
const util = require('../../utils/util')

Page({
  data: { id: '', order: {}, items: [], loading: true },

  goBack() { wx.navigateBack() },

  onLoad(options) {
    this.setData({ id: options.id })
    this.loadOrder()
  },

  loadOrder() {
    request(`/api/purchase-orders/${this.data.id}`, 'GET').then(res => {
      const o = res.data
      this.setData({
        order: {
          ...o,
          total_amount_fmt: util.formatMoney(o.total_amount),
          supplier_name: o.supplier ? o.supplier.name : '未知',
          supplier_phone: o.supplier ? o.supplier.phone || '' : '',
          created_at_fmt: util.formatDateTime(o.created_at)
        },
        items: (o.items || []).map(i => ({
          ...i,
          unit_price_fmt: util.formatMoney(i.unit_price),
          subtotal_fmt: util.formatMoney(i.subtotal),
          product_name: i.product ? i.product.name : '-',
          product_spec: i.product ? i.product.spec || '' : '',
          product_unit: i.product ? i.product.unit || '个' : '个'
        })),
        loading: false
      })
    }).catch(() => this.setData({ loading: false }))
  }
})
