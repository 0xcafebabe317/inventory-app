import http from './request'

export function getSummary() {
  return http.get('/api/reports/summary')
}

export function exportProducts() {
  return http.get('/api/export/products', { responseType: 'blob' })
}

export function exportSales(startDate?: string, endDate?: string) {
  return http.get('/api/export/sales', {
    params: { start_date: startDate, end_date: endDate },
    responseType: 'blob'
  })
}
