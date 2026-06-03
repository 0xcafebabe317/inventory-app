import { defineStore } from 'pinia'
import { ref } from 'vue'
import { adminLogin as loginApi, getAdminProfile } from '../api/auth'

export const useAuthStore = defineStore('admin-auth', () => {
  const token = ref(localStorage.getItem('admin_token') || '')
  const username = ref(localStorage.getItem('admin_username') || '')

  const isLoggedIn = () => !!token.value

  async function login(user: string, pass: string) {
    const res: any = await loginApi(user, pass)
    const { access, username: uname } = res.data
    token.value = access
    username.value = uname
    localStorage.setItem('admin_token', access)
    localStorage.setItem('admin_username', uname)
  }

  async function loadProfile() {
    try {
      const res: any = await getAdminProfile()
      username.value = res.data.username
    } catch { /* token invalid */ }
  }

  function logout() {
    token.value = ''
    username.value = ''
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_username')
  }

  return { token, username, isLoggedIn, login, loadProfile, logout }
})
