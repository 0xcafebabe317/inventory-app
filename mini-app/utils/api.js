/**
 * API 封装 — 所有后端接口路径
 */
const request = require('./request').default

module.exports = {
  // Auth
  login: (phone, password) => request('/api/auth/login', 'POST', { phone, password }),
  register: (phone, password, nickname) => request('/api/auth/register', 'POST', { phone, password, nickname }),
  refreshToken: (refreshToken) => request('/api/auth/refresh', 'POST', { refresh_token: refreshToken }),
  getProfile: () => request('/api/user/profile', 'GET'),
  updateProfile: (data) => request('/api/user/profile', 'PUT', data),
  changePassword: (oldPassword, newPassword) => request('/api/user/password', 'PUT', { old_password: oldPassword, new_password: newPassword }),
  uploadAvatar: (filePath) => new Promise((resolve, reject) => {
    wx.uploadFile({
      url: 'https://www.tzjxc.online/api/upload/avatar',
      filePath,
      name: 'file',
      header: { 'Authorization': `Bearer ${wx.getStorageSync('access_token')}` },
      success: (res) => resolve(JSON.parse(res.data)),
      fail: reject
    })
  }),

  // Products
  getProducts: (params = {}) => request('/api/products', 'GET', params),
  createProduct: (data) => request('/api/products', 'POST', data),
  updateProduct: (id, data) => request(`/api/products/${id}`, 'PUT', data),
  deactivateProduct: (id) => request(`/api/products/${id}`, 'DELETE'),
  getStockLog: (productId, page = 1) => request(`/api/products/${productId}/stock-log`, 'GET', { page }),

  // Suppliers
  getSuppliers: () => request('/api/suppliers', 'GET'),
  createSupplier: (data) => request('/api/suppliers', 'POST', data),
  updateSupplier: (id, data) => request(`/api/suppliers/${id}`, 'PUT', data),

  // Customers
  getCustomers: () => request('/api/customers', 'GET'),
  createCustomer: (data) => request('/api/customers', 'POST', data),
  updateCustomer: (id, data) => request(`/api/customers/${id}`, 'PUT', data),
  getCustomerLedger: (id) => request(`/api/customers/${id}/ledger`, 'GET'),

  // Sales
  createSale: (data) => request('/api/sale-orders', 'POST', data),
  getSales: (params = {}) => request('/api/sale-orders', 'GET', params),
  getSale: (id) => request(`/api/sale-orders/${id}`, 'GET'),
  refundSale: (id) => request(`/api/sale-orders/${id}/refund`, 'POST'),

  // Purchases
  createPurchase: (data) => request('/api/purchase-orders', 'POST', data),

  // Repayments
  createRepayment: (data) => request('/api/repayments', 'POST', data),

  // Reports
  getSummary: () => request('/api/reports/summary', 'GET'),
}
