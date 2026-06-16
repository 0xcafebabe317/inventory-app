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

function copyText(text) {
  wx.setClipboardData({
    data: text || '',
    success() { wx.showToast({ title: '已复制', icon: 'success' }) }
  })
}

const BASE_URL = 'https://www.tzjxc.online'

function formatDateCN(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const day = d.getDate()
  return `${y}年${m}月${day}日`
}

function formatExpiry(user) {
  if (!user) return { display: '-', cssClass: '' }

  let expiresAt = null
  let isTrial = false

  if (user.subscription_expires_at) {
    expiresAt = new Date(user.subscription_expires_at)
  } else if (user.subscription_status === 'trial' && user.created_at) {
    const d = new Date(user.created_at)
    d.setDate(d.getDate() + 7)
    expiresAt = d
    isTrial = true
  }

  if (!expiresAt) return { display: '-', cssClass: '' }

  const now = new Date()
  const diffDays = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24))
  const dateStr = formatDateCN(expiresAt)

  let suffix = ''
  let cssClass = ''

  if (diffDays < 0) {
    suffix = '（已到期）'
    cssClass = 'expiry-danger'
  } else if (diffDays === 0) {
    suffix = '（今日到期）'
    cssClass = 'expiry-danger'
  } else if (diffDays <= 7) {
    suffix = `（还剩${diffDays}天）`
    cssClass = 'expiry-danger'
  } else if (isTrial) {
    suffix = `（试用 · 还剩${diffDays}天）`
    cssClass = 'expiry-safe'
  } else {
    suffix = `（还剩${diffDays}天）`
    cssClass = 'expiry-safe'
  }

  return { display: dateStr + suffix, cssClass }
}

function fullUrl(path) {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return BASE_URL + path
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
  formatDateCN,
  formatDateTime,
  formatExpiry,
  formatMoney,
  copyText,
  fullUrl,
  payMethodLabel,
  subscriptionStatusLabel
}
