<template>
  <el-container class="layout-container">
    <!-- Sidebar -->
    <el-aside :width="isCollapse ? '64px' : '220px'" class="layout-sidebar">
      <div class="sidebar-brand">
        <img src="/logo.png" alt="logo" class="sidebar-logo" @error="onImgError" />
        <transition name="fade">
          <span v-show="!isCollapse" class="sidebar-title">兔子进销存</span>
        </transition>
      </div>
      <el-menu
        :default-active="route.path"
        :collapse="isCollapse"
        :collapse-transition="false"
        router
        background-color="#1e293b"
        text-color="#94a3b8"
        active-text-color="#ffffff"
        class="sidebar-menu"
      >
        <el-menu-item index="/dashboard">
          <el-icon><DataAnalysis /></el-icon>
          <template #title>仪表盘</template>
        </el-menu-item>
        <el-menu-item index="/users">
          <el-icon><User /></el-icon>
          <template #title>用户管理</template>
        </el-menu-item>
        <el-menu-item index="/logs">
          <el-icon><Document /></el-icon>
          <template #title>操作日志</template>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <!-- Main -->
    <el-container class="layout-main">
      <!-- Header -->
      <el-header class="layout-header">
        <div class="header-left">
          <el-button
            text
            class="collapse-btn"
            @click="isCollapse = !isCollapse"
          >
            <el-icon :size="20">
              <Fold v-if="!isCollapse" />
              <Expand v-else />
            </el-icon>
          </el-button>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item v-if="route.meta.title">{{ route.meta.title }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-button text @click="showPwdDialog = true">
            <el-icon style="margin-right:4px"><Lock /></el-icon>
            修改密码
          </el-button>
          <el-button text type="danger" @click="logout">
            <el-icon style="margin-right:4px"><SwitchButton /></el-icon>
            退出登录
          </el-button>
        </div>
      </el-header>

      <!-- Content -->
      <el-main class="layout-content">
        <slot />
        <div class="icp-footer">
          <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener">藏ICP备2026000658号</a>
        </div>
      </el-main>
    </el-container>

    <!-- Change Password Dialog -->
    <el-dialog v-model="showPwdDialog" title="修改密码" width="420px" :close-on-click-modal="false">
      <el-form :model="pwdForm" label-width="80px" :rules="pwdRules" ref="pwdFormRef">
        <el-form-item label="旧密码" prop="oldPassword">
          <el-input v-model="pwdForm.oldPassword" type="password" placeholder="请输入旧密码" show-password />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="pwdForm.newPassword" type="password" placeholder="至少6位" show-password />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input v-model="pwdForm.confirmPassword" type="password" placeholder="再次输入新密码" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showPwdDialog = false">取消</el-button>
        <el-button type="primary" :loading="pwdLoading" @click="handleChangePwd">确认修改</el-button>
      </template>
    </el-dialog>
  </el-container>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { DataAnalysis, User, Document, Fold, Expand, Lock, SwitchButton } from '@element-plus/icons-vue'
import { changePassword } from '../api/admin'

const router = useRouter()
const route = useRoute()

const isCollapse = ref(false)
const showPwdDialog = ref(false)
const pwdFormRef = ref()
const pwdForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })
const pwdLoading = ref(false)
const pwdRules = {
  oldPassword: [{ required: true, message: '请输入旧密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      validator: (_rule: any, value: string, cb: any) => {
        if (value !== pwdForm.newPassword) cb(new Error('两次密码不一致'))
        else cb()
      },
      trigger: 'blur'
    }
  ]
}

function onImgError(e: Event) {
  (e.target as HTMLImageElement).style.display = 'none'
}

async function handleChangePwd() {
  const valid = await pwdFormRef.value?.validate().catch(() => false)
  if (!valid) return
  pwdLoading.value = true
  try {
    await changePassword(pwdForm.oldPassword, pwdForm.newPassword)
    ElMessage.success('密码修改成功')
    showPwdDialog.value = false
    pwdForm.oldPassword = ''
    pwdForm.newPassword = ''
    pwdForm.confirmPassword = ''
  } catch { /* handled by interceptor */ }
  finally { pwdLoading.value = false }
}

function logout() {
  localStorage.removeItem('admin_token')
  router.push('/login')
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
}

/* Sidebar */
.layout-sidebar {
  background: #1e293b;
  overflow: hidden;
  transition: width 0.3s;
  display: flex;
  flex-direction: column;
}
.sidebar-brand {
  display: flex;
  align-items: center;
  padding: 18px 16px;
  gap: 10px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  white-space: nowrap;
}
.sidebar-logo {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
}
.sidebar-title {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.5px;
}

/* Sidebar Menu - override element-plus defaults */
.sidebar-menu {
  border-right: none;
  flex: 1;
}
.sidebar-menu .el-menu-item {
  border-radius: 6px;
  margin: 4px 8px;
  width: auto;
}
.sidebar-menu .el-menu-item:hover {
  background: rgba(255,255,255,0.08) !important;
}
.sidebar-menu .el-menu-item.is-active {
  background: #2563eb !important;
  color: #fff !important;
}

/* Main area */
.layout-main {
  flex-direction: column;
  background: #f0f4f8;
}

/* Header */
.layout-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  padding: 0 20px;
  height: 56px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.collapse-btn {
  font-size: 18px;
  color: #64748b;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Content */
.layout-content {
  padding: 24px 32px;
  width: 100%;
  box-sizing: border-box;
}

/* Transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ICP footer */
.icp-footer {
  text-align: center;
  padding: 20px 0 8px;
}
.icp-footer a {
  font-size: 12px;
  color: #969799;
  text-decoration: none;
}
</style>
