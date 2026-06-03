<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { showDialog, showToast } from 'vant'
import { useAuthStore } from '../../stores/auth'
import { changePassword, updateProfile } from '../../api/auth'
import { formatPhone } from '../../utils/format'

const router = useRouter()
const auth = useAuthStore()

onMounted(async () => {
  if (!auth.user) await auth.loadProfile()
})

// Expiry date display with color coding
const expiryDaysLeft = computed(() => {
  if (!auth.user) return null
  let expiryDate: Date | null = null
  if (auth.user.subscription_expires_at) {
    expiryDate = new Date(auth.user.subscription_expires_at)
  } else if (auth.user.subscription_status === 'trial' && auth.user.created_at) {
    expiryDate = new Date(auth.user.created_at)
    expiryDate.setDate(expiryDate.getDate() + 7)
  }
  if (!expiryDate) return null
  const now = new Date()
  const diff = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return diff
})

const expiryDisplay = computed(() => {
  if (!auth.user) return '-'
  if (auth.user.subscription_expires_at) {
    return new Date(auth.user.subscription_expires_at).toLocaleDateString('zh-CN')
  }
  if (auth.user.subscription_status === 'trial' && auth.user.created_at) {
    const d = new Date(auth.user.created_at)
    d.setDate(d.getDate() + 7)
    return d.toLocaleDateString('zh-CN') + '（试用）'
  }
  return '-'
})

const expiryClass = computed(() => {
  if (expiryDaysLeft.value === null) return ''
  if (expiryDaysLeft.value <= 7) return 'expiry-danger'
  return 'expiry-safe'
})

// Change password dialog
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
    await changePassword(oldPassword, newPassword)
    showToast('密码修改成功')
    showPwdDialog.value = false
  } catch { /* error handled by interceptor */ }
  finally { pwdLoading.value = false }
}

// Edit nickname dialog
const showNicknameDialog = ref(false)
const nicknameForm = ref('')
const nicknameLoading = ref(false)

function openNicknameDialog() {
  nicknameForm.value = auth.user?.nickname || ''
  showNicknameDialog.value = true
}

async function handleUpdateNickname() {
  if (!nicknameForm.value) {
    showToast('请输入昵称')
    return
  }
  nicknameLoading.value = true
  try {
    await updateProfile({ nickname: nicknameForm.value })
    if (auth.user) auth.user.nickname = nicknameForm.value
    showToast('昵称修改成功')
    showNicknameDialog.value = false
  } catch { /* */ }
  finally { nicknameLoading.value = false }
}

function handleLogout() {
  showDialog({
    title: '退出登录',
    message: '确定要退出吗？'
  }).then(() => {
    auth.logout()
    router.push('/login')
  })
}

</script>

<template>
  <div class="page">
    <!-- Profile -->
    <div class="profile-card">
      <van-image round width="60" height="60" src="/h5/default-avatar.png">
        <template #error><van-icon name="user-o" size="36" /></template>
      </van-image>
      <div class="profile-info">
        <div class="profile-name" @click="openNicknameDialog">
          {{ auth.user?.nickname || '点击设置昵称' }}
          <van-icon name="edit" size="14" color="#969799" style="margin-left:4px" />
        </div>
        <div class="text-secondary">{{ formatPhone(auth.user?.phone || '') }}</div>
      </div>
    </div>

    <!-- Expiry Time -->
    <div class="card">
      <div class="stat-row">
        <span>到期时间</span>
        <span class="expiry-value" :class="expiryClass">{{ expiryDisplay }}</span>
      </div>
    </div>

    <!-- Menu -->
    <van-cell-group inset style="margin-top:12px">
      <van-cell title="修改昵称" icon="user-o" is-link @click="openNicknameDialog" />
      <van-cell title="修改密码" icon="lock" is-link @click="openPwdDialog" />
      <van-cell title="进货商管理" icon="shop-o" is-link @click="router.push('/supplier-manage')" />
      <van-cell title="客户管理" icon="friends-o" is-link @click="router.push('/customer-manage')" />
      <van-cell title="联系管理员" icon="service-o" is-link @click="router.push('/contact')" />
      <van-cell title="关于" icon="info-o" value="v1.0.0" />
    </van-cell-group>

    <div style="margin: 24px 16px">
      <van-button round block type="danger" @click="handleLogout">退出登录</van-button>
    </div>

    <!-- Change Password Dialog -->
    <van-dialog v-model:show="showPwdDialog" title="修改密码" show-cancel-button
      :confirm-loading="pwdLoading" @confirm="handleChangePwd">
      <div class="dialog-form">
        <van-field v-model="pwdForm.oldPassword" type="password" label="旧密码" placeholder="请输入旧密码" />
        <van-field v-model="pwdForm.newPassword" type="password" label="新密码" placeholder="至少6位" />
        <van-field v-model="pwdForm.confirmPassword" type="password" label="确认密码" placeholder="再次输入新密码" />
      </div>
    </van-dialog>

    <!-- Edit Nickname Dialog -->
    <van-dialog v-model:show="showNicknameDialog" title="修改昵称" show-cancel-button
      :confirm-loading="nicknameLoading" @confirm="handleUpdateNickname">
      <div class="dialog-form">
        <van-field v-model="nicknameForm" label="昵称" placeholder="请输入昵称" />
      </div>
    </van-dialog>
  </div>
</template>

<style scoped>
.page { padding: 12px; padding-bottom: 40px; }
.profile-card {
  display: flex; align-items: center; gap: 14px;
  background: #fff; border-radius: 10px; padding: 20px; margin-bottom: 12px;
}
.profile-name { font-size: 18px; font-weight: 600; margin-bottom: 4px; display: flex; align-items: center; }
.card { background: #fff; border-radius: 10px; padding: 16px; margin-bottom: 12px; }
.stat-row { display: flex; justify-content: space-between; align-items: center; font-size: 15px; }
.expiry-value {
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 13px;
  transition: all 0.3s;
}
.expiry-safe {
  background: #e8f5e9;
  color: #2e7d32;
}
.expiry-danger {
  background: #ffebee;
  color: #c62828;
}
.text-secondary { color: #969799; font-size: 13px; }
.dialog-form { padding: 12px 0; }
</style>
