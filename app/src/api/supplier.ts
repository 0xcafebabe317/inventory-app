import http from './request'

export function getSuppliers() {
  return http.get('/api/suppliers')
}

export function createSupplier(data: any) {
  return http.post('/api/suppliers', data)
}

export function updateSupplier(id: number, data: any) {
  return http.put(`/api/suppliers/${id}`, data)
}
