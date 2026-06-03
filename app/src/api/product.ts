import http from './request'

export function getProducts(params: any) {
  return http.get('/api/products', { params })
}

export function createProduct(data: any) {
  return http.post('/api/products', data)
}

export function updateProduct(id: number, data: any) {
  return http.put(`/api/products/${id}`, data)
}

export function deactivateProduct(id: number) {
  return http.delete(`/api/products/${id}`)
}

export function getStockLog(productId: number, page: number = 1) {
  return http.get(`/api/products/${productId}/stock-log`, { params: { page } })
}
