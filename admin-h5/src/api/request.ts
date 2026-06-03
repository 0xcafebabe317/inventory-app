import axios from 'axios'
import { showToast } from 'vant'

const http = axios.create({
  baseURL: '',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
})

// Request interceptor
http.interceptors.request.use(config => {
  const token = localStorage.getItem('admin_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor
http.interceptors.response.use(
  res => res.data,
  err => {
    const status = err.response?.status

    if (status === 401) {
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_username')
      window.location.hash = '#/login'
      return Promise.reject(err)
    }

    if (status === 429) {
      showToast('操作太频繁，请稍后')
      return Promise.reject(err)
    }

    if (!err.response) {
      showToast('网络开小差了，请重试')
      return Promise.reject(err)
    }

    const msg = err.response?.data?.message || '请求失败'
    if (status && status >= 500) showToast(msg)
    return Promise.reject(err)
  }
)

export default http
export const adminHttp = http
