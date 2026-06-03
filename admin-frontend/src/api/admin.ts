import http from './request'

export const login = (username: string, password: string) =>
  http.post('/admin/api/login', { username, password })

export const getProfile = () => http.get('/admin/api/profile')

export const changePassword = (oldPassword: string, newPassword: string) =>
  http.put('/admin/api/password', { old_password: oldPassword, new_password: newPassword })

export const getDashboard = () => http.get('/admin/api/dashboard')

export const getUsers = (params: any) => http.get('/admin/api/users', { params })

export const getUser = (id: number) => http.get(`/admin/api/users/${id}`)

export const activateUser = (id: number, data: { plan: string; expires_at: string; remark?: string }) =>
  http.post(`/admin/api/users/${id}/activate`, data)

export const disableUser = (id: number) =>
  http.post(`/admin/api/users/${id}/disable`)

export const getOperationLogs = (params: any) =>
  http.get('/admin/api/operation-logs', { params })
