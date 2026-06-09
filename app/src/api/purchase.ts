import http from './request'

export function createPurchase(data: any) {
  return http.post('/api/purchase-orders', data)
}

export function getPurchases(params: any) {
  return http.get('/api/purchase-orders', { params })
}

export function getSupplierTransactions(supplierId: number, params?: any) {
  return http.get(`/api/suppliers/${supplierId}/transactions`, { params })
}

export function updatePurchaseInvoice(orderId: number, invoiceUrl: string) {
  return http.put(`/api/purchase-orders/${orderId}/invoice`, { invoice_url: invoiceUrl })
}
