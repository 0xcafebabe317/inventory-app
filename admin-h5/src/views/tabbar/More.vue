<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showToast } from 'vant'
import { useAuthStore } from '../../stores/auth'
import { changeAdminPassword } from '../../api/auth'

const router = useRouter()
const auth = useAuthStore()

function handleLogout() {
  showConfirmDialog({ title: '退出登录', message: '确定要退出吗？' }).then(() => {
    auth.logout()
    router.replace('/login')
  }).catch(() => {})
}

// Change password
const showPwdDialog = ref(false)
const pwdForm = ref({ oldPassword: '', newPassword: '', confirmPassword: '' })
const pwdLoading = ref(false)

function openPwdDialog() {
  pwdForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
  showPwdDialog.value = true
}

async function handleChangePwd() {
  const { oldPassword, newPassword, confirmPassword } = pwdForm.value
  if (!oldPassword || !newPassword) {
    showToast('请填写完整')
    return
  }
  if (newPassword.length < 6) {
    showToast('新密码至少6位')
    return
  }
  if (newPassword !== confirmPassword) {
    showToast('两次密码不一致')
    return
  }
  pwdLoading.value = true
  try {
    await changeAdminPassword(oldPassword, newPassword)
    showToast('密码修改成功')
    showPwdDialog.value = false
  } catch { /* */ }
  finally { pwdLoading.value = false }
}
</script>

<template>
  <div class="page">
    <h2 class="page-title">更多</h2>

    <div class="profile-card">
      <div class="avatar">{{ auth.username?.charAt(0)?.toUpperCase() || 'A' }}</div>
      <div>
        <div class="profile-name">{{ auth.username }}</div>
        <div class="profile-role">管理员</div>
      </div>
    </div>

    <van-cell-group inset>
      <van-cell title="修改密码" icon="lock" is-link @click="openPwdDialog" />
      <van-cell title="用户管理" icon="friends-o" is-link to="/users" />
      <van-cell title="客户管理" icon="contact-o" is-link to="/customers" />
      <van-cell title="报表中心" icon="bar-chart-o" is-link to="/reports" />
      <van-cell title="操作日志" icon="records-o" is-link to="/logs" />
    </van-cell-group>

    <div style="margin: 24px 16px">
      <van-button round block type="danger" @click="handleLogout">退出登录</van-button>
    </div>

    <!-- Change Password Dialog -->
    <van-dialog v-model:show="showPwdDialog" title="修改密码" show-cancel-button
      :confirm-loading="pwdLoading" @confirm="handleChangePwd">
      <div class="pwd-form">
        <van-field v-model="pwdForm.oldPassword" type="password" label="旧密码" placeholder="请输入旧密码" />
        <van-field v-model="pwdForm.newPassword" type="password" label="新密码" placeholder="至少6位" />
        <van-field v-model="pwdForm.confirmPassword" type="password" label="确认密码" placeholder="再次输入新密码" />
      </div>
    </van-dialog>
  </div>
</template>

<style scoped>
.page { background: #f7f8fa; min-height: 100vh; padding-bottom: 50px; }
.page-title { font-size: 22px; font-weight: 700; padding: 16px 16px 8px; }
.profile-card { display: flex; align-items: center; gap: 14px; background: #fff; border-radius: 8px; margin: 0 12px 16px; padding: 20px; }
.avatar { width: 48px; height: 48px; border-radius: 50%; background: #1989fa; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700; }
.profile-name { font-size: 17px; font-weight: 600; }
.profile-role { font-size: 12px; color: #969799; }
.pwd-form { padding: 12px 0; }
</style>
