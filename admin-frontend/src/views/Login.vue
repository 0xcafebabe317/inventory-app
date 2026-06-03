<template>
  <div class="login-wrap">
    <div class="login-card">
      <div class="login-brand">
        <img src="/logo.png" alt="logo" class="login-logo" @error="e => (e.target as any).style.display='none'" />
        <h1>兔子进销存</h1>
        <p>管理后台</p>
      </div>
      <el-form :model="form" :rules="rules" ref="formRef" @submit.prevent="handleLogin" size="large">
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="管理员用户名" :prefix-icon="User" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" type="password" placeholder="密码" show-password :prefix-icon="Lock" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" style="width:100%" :loading="loading" @click="handleLogin" size="large">
            登 录
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { login } from '../api/admin'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'

const router = useRouter()
const formRef = ref()
const loading = ref(false)
const form = reactive({ username: '', password: '' })
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

function handleLogin() {
  formRef.value?.validate((valid: boolean) => {
    if (!valid) return
    loading.value = true
    login(form.username, form.password)
      .then((res: any) => {
        localStorage.setItem('admin_token', res.data.access)
        ElMessage.success('登录成功')
        router.push('/dashboard')
      })
      .finally(() => loading.value = false)
  })
}
</script>

<style scoped>
.login-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 40%, #bfdbfe 100%);
}
.login-card {
  width: 400px;
  background: #fff;
  border-radius: 16px;
  padding: 40px 36px;
  box-shadow: 0 20px 60px rgba(37, 99, 235, 0.15);
}
.login-brand {
  text-align: center;
  margin-bottom: 32px;
}
.login-logo {
  width: 60px;
  height: 60px;
  border-radius: 14px;
  margin-bottom: 14px;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
}
.login-brand h1 {
  margin: 0;
  font-size: 24px;
  color: #1e293b;
  font-weight: 700;
  letter-spacing: 1px;
}
.login-brand p {
  margin: 6px 0 0;
  font-size: 14px;
  color: #94a3b8;
}
</style>
