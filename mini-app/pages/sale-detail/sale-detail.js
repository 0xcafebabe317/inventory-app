const request = require('../../utils/request').default
const util = require('../../utils/util')

Page({
  data: { id: '', order: {}, items: [], loading: true },

  onLoad(options) {
    this.setData({ id: options.id })
    this.loadOrder()
  },

  loadOrder() {
    request(`/api/sale-orders/${this.data.id}`, 'GET').then(res => {
      const o = res.data
      this.setData({
        order: {
          ...o,
          total_amount_fmt: util.formatMoney(o.total_amount),
          paid_amount_fmt: util.formatMoney(o.paid_amount),
          credit_amount_fmt: util.formatMoney(o.credit_amount),
          pay_method_label: util.payMethodLabel(o.pay_method),
          customer_name: o.customer ? o.customer.name : '散客',
          created_at_fmt: util.formatDateTime(o.created_at),
          status_label: o.status === 'completed' ? '已完成' : '已退货'
        },
        items: (o.items || []).map(i => ({
          ...i, unit_price_fmt: util.formatMoney(i.unit_price), subtotal_fmt: util.formatMoney(i.subtotal),
          product_name: i.product ? i.product.name : '-'
        })),
        loading: false
      })
    }).catch(() => this.setData({ loading: false }))
  },

  refund() {
    wx.showModal({
      title: '确认退货',
      content: '确定要退货吗？库存将自动回退。',
      success: res => {
        if (res.confirm) {
          request(`/api/sale-orders/${this.data.id}/refund`, 'POST').then(() => {
            wx.showToast({ title: '退货成功', icon: 'success' })
            this.loadOrder()
          })
        }
      }
    })
  }
})
