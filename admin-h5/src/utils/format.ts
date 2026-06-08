export function formatMoney(n: number | string): string {
  const num = typeof n === 'string' ? parseFloat(n) : n
  if (isNaN(num)) return '0.00'
  return num.toFixed(2)
}

export function formatDate(d: string): string {
  if (!d) return ''
  return new Date(d).toLocaleDateString('zh-CN')
}

export function formatDateTime(d: string): string {
  if (!d) return ''
  const date = new Date(d)
  return date.toLocaleDateString('zh-CN') + ' ' +
    date.toTimeString().slice(0, 5)
}

export function payMethodLabel(m: string): string {
  const map: Record<string, string> = {
    cash: '现金', wechat: '微信', alipay: '支付宝', credit: '赊账'
  }
  return map[m] || m
}

export function statusLabel(s: string): string {
  const map: Record<string, string> = {
    active: '正常', trial: '试用中', expired: '已过期', disabled: '已禁用',
    completed: '已完成', refunded: '已退货'
  }
  return map[s] || s
}

export type TagColor = 'primary' | 'success' | 'warning' | 'danger'

export function statusColor(s: string): TagColor {
  const map: Record<string, TagColor> = {
    active: 'success', trial: 'primary', expired: 'warning', disabled: 'danger',
    completed: 'success', refunded: 'warning'
  }
  return map[s] || 'primary'
}

export function planLabel(p: string): string {
  const map: Record<string, string> = {
    custom: '自定义', monthly: '月卡', quarterly: '季卡', yearly: '年卡', permanent: '永久'
  }
  return map[p] || p || '无'
}
