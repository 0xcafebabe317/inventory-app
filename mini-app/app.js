const auth = require('./utils/auth')
const request = require('./utils/request').default

App({
  globalData: {
    userInfo: null,
    phone: '',
    subscription: {
      status: 'trial',
      plan: null,
      expiresAt: null,
      trialDaysLeft: 7
    },
    shopSnapshot: {
      todaySales: 0,
      todayProfit: 0,
      monthSales: 0,
      monthProfit: 0,
      totalAr: 0
    }
  },

  onLaunch() {
    // 检查本地 token，有效则加载 profile
    const token = wx.getStorageSync('access_token')
    if (token) {
      this.loadProfile()
    }
    // 不在这里自动调 wx.login，让登录页面处理
  },

  checkLogin() {
    const token = wx.getStorageSync('access_token')
    return !!token
  },

  doWechatLogin() {
    return auth.login().then(result => {
      if (result.newUser && !result.access) {
        return { newUser: true }
      } else {
        this.globalData.userInfo = result.user || null
        return this.loadProfile().then(() => ({ newUser: false }))
      }
    })
  },

  loadProfile() {
    return request('/api/user/profile', 'GET').then(res => {
      if (res.code === 'OK') {
        const { user, trial_days_left } = res.data
        this.globalData.userInfo = {
          nickname: user.nickname,
          avatar_url: user.avatar_url,
          phone: user.phone,
          subscription_status: user.subscription_status,
          subscription_plan: user.subscription_plan,
          subscription_expires_at: user.subscription_expires_at,
          created_at: user.created_at
        }
        this.globalData.phone = user.phone
        this.globalData.subscription = {
          status: user.subscription_status,
          plan: user.subscription_plan,
          expiresAt: user.subscription_expires_at,
          trialDaysLeft: trial_days_left || 0
        }
      }
    }).catch(() => {})
  },

  setSubscription(sub) {
    this.globalData.subscription = { ...this.globalData.subscription, ...sub }
  },

  setShopSnapshot(data) {
    this.globalData.shopSnapshot = { ...this.globalData.shopSnapshot, ...data }
  },

  isLocked() {
    const { status } = this.globalData.subscription
    return status === 'expired' || status === 'disabled'
  },

  // 获取到期天数（试用期）
  getTrialDaysLeft() {
    return this.globalData.subscription.trialDaysLeft || 0
  }
})
