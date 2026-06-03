import http from './request'

export function adminLogin(username: string, password: string) {
  return http.post('/admin/api/login', { username, password })
}

export function getAdminProfile() {
  return http.get('/admin/api/profile')
}

export function changeAdminPassword(oldPassword: string, newPassword: string) {
  return http.put('/admin/api/password', { old_password: oldPassword, new_password: newPassword })
}
