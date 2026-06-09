<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { showDialog, showToast, showSuccessToast } from 'vant'
import { useAuthStore } from '../../stores/auth'
import { changePassword, updateProfile, uploadAvatar } from '../../api/auth'
import { formatPhone } from '../../utils/format'

const router = useRouter()
const auth = useAuthStore()
const defaultAvatar = '/default-avatar.png'

onMounted(async () => {
  if (!auth.user) await auth.loadProfile()
})

// ===== 头像上传 =====
const avatarFile = ref<File | null>(null)
const avatarPreviewUrl = ref('')
const avatarInputRef = ref<HTMLInputElement | null>(null)
const uploadingAvatar = ref(false)

function onAvatarChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  avatarFile.value = file
  if (avatarPreviewUrl.value) URL.revokeObjectURL(avatarPreviewUrl.value)
  avatarPreviewUrl.value = URL.createObjectURL(file)
  // 选完图片立即上传
  handleUploadAvatar()
}

async function handleUploadAvatar() {
  if (!avatarFile.value) return
  uploadingAvatar.value = true
  try {
    const res: any = await uploadAvatar(avatarFile.value)
    const url = res.data?.url || ''
    if (url) {
      await updateProfile({ avatar_url: url })
      if (auth.user) auth.user.avatar_url = url
      showSuccessToast('头像更新成功')
    }
  } catch {
    showToast('头像上传失败')
  } finally {
    uploadingAvatar.value = false
    // 清理预览 URL
    if (avatarPreviewUrl.value) {
      URL.revokeObjectURL(avatarPreviewUrl.value)
      avatarPreviewUrl.value = ''
    }
    avatarFile.value = null
    // 重置 input 以便重复选择同一文件
    if (avatarInputRef.value) avatarInputRef.value.value = ''
  }
}

function triggerAvatarUpload() {
  avatarInputRef.value?.click()
}

onUnmounted(() => {
  if (avatarPreviewUrl.value) URL.revokeObjectURL(avatarPreviewUrl.value)
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
      <div class="avatar-wrapper" @click="triggerAvatarUpload">
        <van-image round width="60" height="60" :src="avatarPreviewUrl || auth.user?.avatar_url || defaultAvatar">
          <template #error><van-icon name="user-o" size="36" /></template>
          <template #loading><van-icon name="user-o" size="36" /></template>
        </van-image>
        <div class="avatar-overlay" v-if="!uploadingAvatar">
          <van-icon name="photograph" size="18" color="#fff" />
        </div>
        <div class="avatar-overlay uploading" v-else>
          <van-loading size="18" color="#fff" />
        </div>
      </div>
      <input ref="avatarInputRef" type="file" accept="image/*" style="display:none" @change="onAvatarChange" />
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

    <!-- ICP备案号 -->
    <div class="icp-footer">
      <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener">藏ICP备2026000658号</a>
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
.avatar-wrapper {
  position: relative; width: 60px; height: 60px; border-radius: 50%;
  cursor: pointer; flex-shrink: 0;
}
.avatar-wrapper :deep(.van-image) { display: block; }
.avatar-overlay {
  position: absolute; bottom: 0; right: 0;
  width: 24px; height: 24px; border-radius: 50%;
  background: #2563eb; border: 2px solid #fff;
  display: flex; align-items: center; justify-content: center;
  transition: transform 0.2s;
}
.avatar-overlay.uploading { background: #94a3b8; }
.avatar-wrapper:active .avatar-overlay { transform: scale(0.9); }
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

.icp-footer {
  text-align: center;
  padding: 0 0 20px;
}
.icp-footer a {
  font-size: 11px;
  color: #c8c9cc;
  text-decoration: none;
}
</style>
