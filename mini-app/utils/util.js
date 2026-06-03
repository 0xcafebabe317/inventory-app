function formatDate(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now - d

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'

  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  return `${month}-${day}`
}

function formatDateTime(dateStr) {
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const m = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  const h = d.getHours().toString().padStart(2, '0')
  const min = d.getMinutes().toString().padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}

function formatMoney(n) {
  if (n === null || n === undefined) return '0.00'
  return Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function formatPhone(phone) {
  if (!phone || phone.length < 7) return phone
  return phone.slice(0, 3) + '****' + phone.slice(-4)
}

function payMethodLabel(method) {
  const map = {
    cash: '现金',
    wechat: '微信',
    alipay: '支付宝',
    credit: '赊账'
  }
  return map[method] || method
}

function subscriptionStatusLabel(status) {
  const map = {
    trial: '试用中',
    active: '已开通',
    expired: '已到期',
    disabled: '已停用'
  }
  return map[status] || status
}

module.exports = {
  formatDate,
  formatDateTime,
  formatMoney,
  formatPhone,
  payMethodLabel,
  subscriptionStatusLabel
}
