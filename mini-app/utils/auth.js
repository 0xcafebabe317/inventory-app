const request = require('./request').default

function login() {
  return new Promise((resolve, reject) => {
    wx.login({
      success(res) {
        if (res.code) {
          request('/api/auth/wechat-login', 'POST', { code: res.code })
            .then(data => {
              if (data.data.new_user) {
                resolve({ newUser: true, openid: data.data.openid })
              } else {
                wx.setStorageSync('access_token', data.data.access)
                wx.setStorageSync('refresh_token', data.data.refresh)
                resolve({ newUser: false, user: data.data.user, trialDaysLeft: data.data.trial_days_left })
              }
            })
            .catch(reject)
        } else {
          reject(new Error('wx.login failed'))
        }
      },
      fail: reject
    })
  })
}

function nicknameLogin(nickname, password) {
  return request('/api/auth/login', 'POST', { nickname, password }).then(data => {
    wx.setStorageSync('access_token', data.data.access)
    wx.setStorageSync('refresh_token', data.data.refresh)
    return data.data
  })
}

function nicknameRegister(nickname, password) {
  return request('/api/auth/register', 'POST', { nickname, password }).then(data => {
    wx.setStorageSync('access_token', data.data.access)
    wx.setStorageSync('refresh_token', data.data.refresh)
    return data.data
  })
}

function bindProfile(openid, nickname, avatarUrl) {
  return request('/api/auth/bind-profile', 'POST', {
    openid,
    nickname: nickname || '',
    avatar_url: avatarUrl || ''
  }).then(data => {
    wx.setStorageSync('access_token', data.data.access)
    wx.setStorageSync('refresh_token', data.data.refresh)
    return data.data
  })
}

function checkAuth() {
  const token = wx.getStorageSync('access_token')
  const refresh = wx.getStorageSync('refresh_token')
  return !!(token && refresh)
}

function requireAuth() {
  const app = getApp()
  if (!checkAuth()) {
    wx.reLaunch({ url: '/pages/login/login' })
    return false
  }
  if (app.isLocked()) {
    wx.redirectTo({ url: '/pages/lock/lock' })
    return false
  }
  return true
}

function logout() {
  wx.removeStorageSync('access_token')
  wx.removeStorageSync('refresh_token')
  getApp().globalData.userInfo = null
  getApp().globalData.nickname = ''
}

module.exports = { login, nicknameLogin, nicknameRegister, bindProfile, checkAuth, requireAuth, logout }
