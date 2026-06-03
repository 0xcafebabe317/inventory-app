const BASE_URL = 'http://43.136.182.83'

let isRefreshing = false
let refreshQueue = []

function request(url, method = 'GET', data = {}) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}${url}`,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${wx.getStorageSync('access_token')}`
      },
      success(res) {
        if (res.statusCode === 401) {
          // Token expired, try refresh
          handleRefresh(url, method, data, resolve, reject)
          return
        }
        if (res.statusCode === 403 && res.data.code === 'EXPIRED') {
          // Subscription expired
          wx.redirectTo({ url: '/pages/lock/lock' })
          reject(new Error('EXPIRED'))
          return
        }
        if (res.statusCode === 429) {
          wx.showToast({ title: '操作太频繁，请稍后', icon: 'none' })
          reject(new Error('RATE_LIMITED'))
          return
        }
        if (res.statusCode >= 500) {
          wx.showToast({ title: '网络开小差了，请重试', icon: 'none' })
          reject(new Error('SERVER_ERROR'))
          return
        }
        resolve(res.data)
      },
      fail() {
        wx.showToast({ title: '网络开小差了，请重试', icon: 'none' })
        reject(new Error('NETWORK_ERROR'))
      }
    })
  })
}

function handleRefresh(url, method, data, resolve, reject) {
  refreshQueue.push({ url, method, data, resolve, reject })

  if (!isRefreshing) {
    isRefreshing = true
    const refreshToken = wx.getStorageSync('refresh_token')

    if (!refreshToken) {
      clearQueue()
      wx.navigateTo({ url: '/pages/index/index' })
      return
    }

    wx.request({
      url: `${BASE_URL}/api/auth/refresh`,
      method: 'POST',
      data: { refresh_token: refreshToken },
      success(res) {
        if (res.data.code === 'OK') {
          wx.setStorageSync('access_token', res.data.data.access)
          // Retry all queued requests
          refreshQueue.forEach(q => {
            request(q.url, q.method, q.data).then(q.resolve).catch(q.reject)
          })
        } else {
          clearQueue()
          wx.navigateTo({ url: '/pages/index/index' })
        }
      },
      fail() {
        clearQueue()
      },
      complete() {
        isRefreshing = false
      }
    })
  }
}

function clearQueue() {
  wx.removeStorageSync('access_token')
  wx.removeStorageSync('refresh_token')
  refreshQueue.forEach(q => q.reject(new Error('AUTH_FAILED')))
  refreshQueue = []
}

module.exports = { default: request, BASE_URL }
