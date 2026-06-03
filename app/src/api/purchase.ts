import http from './request'

export function createPurchase(data: any) {
  return http.post('/api/purchase-orders', data)
}

export function getPurchases(params: any) {
  return http.get('/api/purchase-orders', { params })
}
