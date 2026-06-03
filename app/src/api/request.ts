import axios from 'axios'
import { showToast } from 'vant'

// In dev, proxy /api to localhost:8080. In production, same-origin (nginx serves both H5 and /api).
const BASE_URL = ''

const http = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
})

let isRefreshing = false
let refreshQueue: Array<{ resolve: (v: string) => void; reject: (e: any) => void }> = []

// Request interceptor: attach token
http.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor
http.interceptors.response.use(
  res => res.data,
  async err => {
    const originalRequest = err.config
    const status = err.response?.status
    const code = err.response?.data?.code

    // 403 EXPIRED → redirect to locked screen
    if (status === 403 && code === 'EXPIRED') {
      localStorage.setItem('subscription_locked', 'true')
      window.location.hash = '#/locked'
      return Promise.reject(err)
    }

    // 401 → attempt token refresh
    if (status === 401 && !originalRequest._retry) {
      const refreshToken = localStorage.getItem('refresh_token')
      if (!refreshToken) {
        clearAndRedirect()
        return Promise.reject(err)
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject })
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return http(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const data: any = await axios.post(`${BASE_URL}/api/auth/refresh`, {
          refresh_token: refreshToken
        })
        const newAccess = data.data.access
        localStorage.setItem('access_token', newAccess)
        isRefreshing = false
        refreshQueue.forEach(q => q.resolve(newAccess))
        refreshQueue = []
        originalRequest.headers.Authorization = `Bearer ${newAccess}`
        return http(originalRequest)
      } catch (refreshErr) {
        isRefreshing = false
        refreshQueue.forEach(q => q.reject(refreshErr))
        refreshQueue = []
        clearAndRedirect()
        return Promise.reject(refreshErr)
      }
    }

    // 429 → rate limit
    if (status === 429) {
      showToast('操作太频繁，请稍后')
      return Promise.reject(err)
    }

    // Network error
    if (!err.response) {
      showToast('网络开小差了，请重试')
      return Promise.reject(err)
    }

    // Server error
    const msg = err.response?.data?.message || '请求失败'
    if (status && status >= 500) {
      showToast(msg)
    }
    return Promise.reject(err)
  }
)

function clearAndRedirect() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  window.location.hash = '#/login'
}

export default http
