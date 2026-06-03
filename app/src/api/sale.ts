import http from './request'

export function createSale(data: any) {
  return http.post('/api/sale-orders', data)
}

export function getSales(params: any) {
  return http.get('/api/sale-orders', { params })
}

export function getSale(id: number) {
  return http.get(`/api/sale-orders/${id}`)
}

export function refundSale(id: number) {
  return http.post(`/api/sale-orders/${id}/refund`)
}
