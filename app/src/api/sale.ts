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

export function getCustomerTransactions(customerId: number, params?: any) {
  return http.get(`/api/customers/${customerId}/transactions`, { params })
}

export function updateSaleInvoice(orderId: number, invoiceUrl: string) {
  return http.put(`/api/sale-orders/${orderId}/invoice`, { invoice_url: invoiceUrl })
}
