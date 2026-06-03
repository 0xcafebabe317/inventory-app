import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as apiLogin, register as apiRegister, getProfile } from '../api/auth'

export interface User {
  id: number
  phone: string
  nickname: string
  avatar_url: string
  subscription_status: string
  subscription_plan: string
  trial_start_at: string
  subscription_expires_at: string | null
  created_at: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const accessToken = ref(localStorage.getItem('access_token') || '')
  const refreshToken = ref(localStorage.getItem('refresh_token') || '')
  const trialDaysLeft = ref(0)

  const isLoggedIn = computed(() => !!accessToken.value)
  const isLocked = computed(() => {
    if (!user.value) return false
    const s = user.value.subscription_status
    return s === 'expired' || s === 'disabled'
  })
  const subscriptionStatus = computed(() => user.value?.subscription_status || 'trial')
  const subscriptionLabel = computed(() => {
    const map: Record<string, string> = {
      trial: '试用中', active: '已开通', expired: '已到期', disabled: '已停用'
    }
    return map[subscriptionStatus.value] || '试用中'
  })

  async function login(phone: string, password: string) {
    const res: any = await apiLogin(phone, password)
    const data = res.data
    setTokens(data.access, data.refresh)
    user.value = data.user
    trialDaysLeft.value = data.trial_days_left || 0
    return data
  }

  async function register(phone: string, password: string, nickname: string) {
    const res: any = await apiRegister(phone, password, nickname)
    const data = res.data
    setTokens(data.access, data.refresh)
    user.value = data.user
    trialDaysLeft.value = data.trial_days_left || 0
    return data
  }

  async function loadProfile() {
    try {
      const res: any = await getProfile()
      user.value = res.data.user
      trialDaysLeft.value = res.data.trial_days_left || 0
    } catch {
      // Token invalid, redirect to login
      logout()
    }
  }

  function setTokens(access: string, refresh: string) {
    accessToken.value = access
    refreshToken.value = refresh
    localStorage.setItem('access_token', access)
    localStorage.setItem('refresh_token', refresh)
  }

  function logout() {
    user.value = null
    accessToken.value = ''
    refreshToken.value = ''
    trialDaysLeft.value = 0
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('subscription_locked')
  }

  return {
    user, accessToken, refreshToken, trialDaysLeft,
    isLoggedIn, isLocked, subscriptionStatus, subscriptionLabel,
    login, register, loadProfile, logout
  }
})
