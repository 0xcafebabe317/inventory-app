import http from './request'

export function getAdminDashboard() {
  return http.get('/admin/api/dashboard')
}

export function getOperationLogs(page = 1, pageSize = 10) {
  return http.get('/admin/api/operation-logs', { params: { page, page_size: pageSize } })
}

export function getUsers(page = 1, pageSize = 20, keyword = '') {
  return http.get('/admin/api/users', { params: { page, page_size: pageSize, keyword } })
}

export function getUser(id: number) {
  return http.get(`/admin/api/users/${id}`)
}

export function activateUser(id: number, plan: string, expiresAt: string) {
  return http.post(`/admin/api/users/${id}/activate`, { plan, expires_at: expiresAt })
}

export function disableUser(id: number) {
  return http.post(`/admin/api/users/${id}/disable`)
}

// Products (via admin api)
export function getProducts(params: any) {
  return http.get('/admin/api/products', { params })
}

export function createProduct(data: any) {
  return http.post('/admin/api/products', data)
}

export function updateProduct(id: number, data: any) {
  return http.put(`/admin/api/products/${id}`, data)
}

export function deleteProduct(id: number) {
  return http.delete(`/admin/api/products/${id}`)
}

export function getStockLog(productId: number, page = 1) {
  return http.get(`/admin/api/products/${productId}/stock-log`, { params: { page, page_size: 20 } })
}

// Sales
export function getSales(params: any) {
  return http.get('/admin/api/sales', { params })
}

export function getSale(id: number) {
  return http.get(`/admin/api/sales/${id}`)
}

export function refundSale(id: number) {
  return http.post(`/admin/api/sales/${id}/refund`)
}

// Purchases
export function getPurchases(params: any) {
  return http.get('/admin/api/purchases', { params })
}

export function getPurchase(id: number) {
  return http.get(`/admin/api/purchases/${id}`)
}

// Customers
export function getCustomers(params: any) {
  return http.get('/admin/api/customers', { params })
}

export function getCustomerLedger(id: number) {
  return http.get(`/admin/api/customers/${id}/ledger`)
}

// Reports
export function getSummary() {
  return http.get('/admin/api/reports/summary')
}

export function getProfit(params: any) {
  return http.get('/admin/api/reports/profit', { params })
}

export function getInventoryReport() {
  return http.get('/admin/api/reports/inventory')
}

// Export
export function exportProducts() {
  return http.get('/admin/api/export/products', { responseType: 'blob' })
}

export function exportSales(params: any) {
  return http.get('/admin/api/export/sales', { params, responseType: 'blob' })
}
