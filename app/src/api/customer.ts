import http from './request'

export function getCustomers() {
  return http.get('/api/customers')
}

export function getCustomerLedger(id: number) {
  return http.get(`/api/customers/${id}/ledger`)
}

export function createCustomer(data: any) {
  return http.post('/api/customers', data)
}

export function updateCustomer(id: number, data: any) {
  return http.put(`/api/customers/${id}`, data)
}
