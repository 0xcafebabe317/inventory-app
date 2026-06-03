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

function bindPhone(openid, encryptedData, iv, nickname, avatarUrl) {
  return request('/api/auth/bind-phone', 'POST', {
    openid,
    encrypted_data: encryptedData,
    iv,
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

function logout() {
  wx.removeStorageSync('access_token')
  wx.removeStorageSync('refresh_token')
  getApp().globalData.userInfo = null
  getApp().globalData.phone = ''
}

module.exports = { login, bindPhone, checkAuth, logout }
