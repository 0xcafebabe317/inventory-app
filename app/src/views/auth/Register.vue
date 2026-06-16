<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const auth = useAuthStore()
const nickname = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)

async function handleRegister() {
  if (!nickname.value || !password.value) {
    showToast('请输入昵称和密码')
    return
  }
  if (nickname.value.length < 2) {
    showToast('昵称至少2个字符')
    return
  }
  if (password.value.length < 8) {
    showToast('密码至少8位')
    return
  }
  if (password.value !== confirmPassword.value) {
    showToast('两次密码不一致')
    return
  }
  loading.value = true
  try {
    await auth.register(nickname.value, password.value)
    showToast('注册成功，7天试用已开启')
    router.push('/dashboard')
  } catch (err: any) {
    // Error already handled by interceptor
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-header">
      <img src="/logo.png" alt="logo" class="auth-logo" @error="e => (e.target as any).style.display='none'" />
      <h2>兔子进销存</h2>
      <p>注册即享7天免费试用</p>
    </div>

    <van-form @submit="handleRegister">
      <van-cell-group inset>
        <van-field
          v-model="nickname"
          placeholder="请输入昵称（唯一标识）"
          left-icon="user-o"
          :rules="[{ required: true, message: '请输入昵称' }]"
        />
        <van-field
          v-model="password"
          type="password"
          placeholder="密码（至少8位）"
          left-icon="lock"
          :rules="[{ required: true, message: '请输入密码' }]"
        />
        <van-field
          v-model="confirmPassword"
          type="password"
          placeholder="确认密码"
          left-icon="lock"
          :rules="[{ required: true, message: '请确认密码' }]"
        />
      </van-cell-group>

      <div style="margin: 24px 16px">
        <van-button
          round
          block
          type="primary"
          native-type="submit"
          :loading="loading"
          loading-text="注册中..."
        >
          注册
        </van-button>
      </div>
    </van-form>

    <div class="auth-footer">
      <router-link to="/login">已有账号？立即登录</router-link>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #eff6ff 0%, #f0f4f8 100%);
  display: flex;
  flex-direction: column;
  padding-top: 60px;
}
.auth-header {
  text-align: center;
  margin-bottom: 32px;
}
.auth-logo { width: 60px; height: 60px; border-radius: 12px; margin-bottom: 12px; }
.auth-header h2 {
  font-size: 28px;
  color: #2563eb;
  margin: 0 0 8px;
  font-weight: 700;
}
.auth-header p {
  color: #94a3b8;
  font-size: 14px;
}
.auth-footer {
  text-align: center;
  margin-top: 24px;
}
.auth-footer a {
  color: #2563eb;
  font-size: 14px;
}
</style>
