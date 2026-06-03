<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const auth = useAuthStore()
const username = ref('')
const password = ref('')
const loading = ref(false)

async function handleLogin() {
  if (!username.value) { showToast('请输入用户名'); return }
  if (!password.value) { showToast('请输入密码'); return }
  loading.value = true
  try {
    await auth.login(username.value, password.value)
    showToast('登录成功')
    router.replace('/dashboard')
  } catch (err: any) {
    showToast(err.response?.data?.message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-header">
      <img src="/logo.png" alt="logo" class="login-logo" @error="e => (e.target as any).style.display='none'" />
      <h1>兔子进销存</h1>
      <p>管理员登录</p>
    </div>
    <van-form @submit="handleLogin">
      <van-cell-group inset>
        <van-field v-model="username" label="用户名" placeholder="请输入管理员用户名" />
        <van-field v-model="password" type="password" label="密码" placeholder="请输入密码" />
      </van-cell-group>
      <div style="margin: 20px 16px">
        <van-button round block type="primary" native-type="submit" :loading="loading">登录</van-button>
      </div>
    </van-form>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #eff6ff 0%, #f0f4f8 100%);
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.login-header { text-align: center; margin-bottom: 40px; }
.login-logo { width: 64px; height: 64px; border-radius: 14px; margin-bottom: 12px; }
.login-header h1 { font-size: 28px; color: #2563eb; margin-bottom: 8px; font-weight: 700; }
.login-header p { color: #94a3b8; font-size: 14px; }
</style>
