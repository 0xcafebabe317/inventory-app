import http from './request'

export function register(nickname: string, password: string) {
  return http.post('/api/auth/register', { nickname, password })
}

export function login(nickname: string, password: string) {
  return http.post('/api/auth/login', { nickname, password })
}

export function getProfile() {
  return http.get('/api/user/profile')
}

export function changePassword(oldPassword: string, newPassword: string) {
  return http.put('/api/user/password', { old_password: oldPassword, new_password: newPassword })
}

export function updateProfile(data: { nickname?: string; avatar_url?: string }) {
  return http.put('/api/user/profile', data)
}

export function uploadAvatar(file: File) {
  const form = new FormData()
  form.append('file', file)
  return http.post('/api/upload/avatar', form, {
    headers: { 'Content-Type': undefined as any }
  })
}

export function refreshToken(refreshToken: string) {
  return http.post('/api/auth/refresh', { refresh_token: refreshToken })
}
