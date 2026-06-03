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
    this.checkLogin()
  },

  checkLogin() {
    const token = wx.getStorageSync('access_token')
    if (token) {
      this.loadProfile()
    } else {
      this.doLogin()
    }
  },

  doLogin() {
    const auth = require('./utils/auth')
    auth.login().then(result => {
      if (result.newUser && !result.access) {
        // Need to bind phone (production mode only)
        // In dev mode, auto-created user returns tokens directly
        console.log('New user needs phone bind')
      } else {
        this.globalData.userInfo = result.user || null
        this.loadProfile()
      }
    }).catch(err => {
      console.error('Login failed:', err)
    })
  },

  loadProfile() {
    const request = require('./utils/request').default
    request('/api/user/profile', 'GET').then(res => {
      if (res.code === 'OK') {
        const { user, trial_days_left } = res.data
        this.globalData.userInfo = { nickname: user.nickname, avatar_url: user.avatar_url }
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

  isLocked() {
    const { status } = this.globalData.subscription
    return status === 'expired' || status === 'disabled'
  }
})
