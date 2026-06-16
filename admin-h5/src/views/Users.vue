<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import { getUsers, activateUser, disableUser, viewUserPassword, resetUserPassword } from '../api/admin'
import { statusLabel, statusColor, formatDate, planLabel } from '../utils/format'

const router = useRouter()
const users = ref<any[]>([])
const loading = ref(false)
const finished = ref(false)
const page = ref(1)
const keyword = ref('')
const showActivate = ref(false)
const activateTarget = ref<any>({})
const activateForm = ref({ plan: 'monthly', expires_at: '' })

// Password view state
const passwordVisible = ref<Record<number, boolean>>({})
const passwordLoading = ref<Record<number, boolean>>({})
const passwordValues = ref<Record<number, string>>({})

// Password reset dialog
const showResetPwd = ref(false)
const resetPwdTarget = ref<any>(null)
const resetPwdForm = ref({ newPassword: '' })
const resetPwdLoading = ref(false)
const resetPwdDone = ref('')

onMounted(() => loadUsers())

async function loadUsers(reset = false) {
  if (reset) { page.value = 1; users.value = [] }
  loading.value = true
  try {
    const res: any = await getUsers(page.value, 20, keyword.value)
    const list = res.data?.list || []
    if (reset) users.value = list
    else users.value.push(...list)
    if (list.length < 20) finished.value = true
  } catch { /* */ }
  loading.value = false
}

function loadMore() { if (finished.value) return; page.value++; loadUsers() }
function onSearch() { finished.value = false; loadUsers(true) }
function goDetail(id: number) { router.push(`/user-detail/${id}`) }

async function handleDisable(u: any) {
  try {
    await showConfirmDialog({ title: '确认停用', message: `确定要停用「${u.nickname || u.id}」吗？` })
    await disableUser(u.id)
    showToast('已停用')
    loadUsers(true)
  } catch { /* cancelled */ }
}

// Toggle password visibility
async function togglePassword(u: any, e: Event) {
  e.stopPropagation()
  const uid = u.id

  // If already visible, hide it
  if (passwordVisible.value[uid]) {
    passwordVisible.value = { ...passwordVisible.value, [uid]: false }
    return
  }

  // If we already have the password, show it
  if (passwordValues.value[uid]) {
    passwordVisible.value = { ...passwordVisible.value, [uid]: true }
    return
  }

  // Fetch from API
  passwordLoading.value = { ...passwordLoading.value, [uid]: true }
  try {
    const res: any = await viewUserPassword(uid)
    const pwd = res.data?.password || ''
    passwordValues.value = { ...passwordValues.value, [uid]: pwd }
    passwordVisible.value = { ...passwordVisible.value, [uid]: true }
  } catch (err: any) {
    const msg = err.response?.data?.message || '无法查看密码'
    showToast(msg)
  } finally {
    passwordLoading.value = { ...passwordLoading.value, [uid]: false }
  }
}

// Open reset password dialog
function openResetPwd(u: any, e: Event) {
  e.stopPropagation()
  resetPwdTarget.value = u
  resetPwdForm.value.newPassword = ''
  resetPwdDone.value = ''
  showResetPwd.value = true
}

// Handle password reset
async function handleResetPwd() {
  if (!resetPwdForm.value.newPassword || resetPwdForm.value.newPassword.length < 6) {
    showToast('请输入至少6位新密码')
    return
  }
  resetPwdLoading.value = true
  try {
    const res: any = await resetUserPassword(resetPwdTarget.value.id, resetPwdForm.value.newPassword)
    resetPwdDone.value = res.data?.new_password || resetPwdForm.value.newPassword
    // Update the cached password value
    const uid = resetPwdTarget.value.id
    passwordValues.value = { ...passwordValues.value, [uid]: resetPwdDone.value }
    showToast('密码已重置')
  } catch (err: any) {
    showToast(err.response?.data?.message || '重置失败')
  } finally {
    resetPwdLoading.value = false
  }
}

function getBaseDate(u: any): Date {
  if (u?.subscription_expires_at) {
    const d = new Date(u.subscription_expires_at)
    if (d > new Date()) return d
  }
  return new Date()
}

const calcPreview = computed(() => {
  if (activateForm.value.plan === 'custom') return ''
  if (activateForm.value.plan === 'permanent') return '永久有效'
  const base = getBaseDate(activateTarget.value)
  const d = new Date(base)
  switch (activateForm.value.plan) {
    case 'monthly': d.setDate(d.getDate() + 30); break
    case 'quarterly': d.setDate(d.getDate() + 90); break
    case 'yearly': d.setDate(d.getDate() + 365); break
  }
  return `到期：${d.toISOString().split('T')[0]}`
})

const calcHint = computed(() => {
  if (activateForm.value.plan === 'custom' || activateForm.value.plan === 'permanent') return ''
  const base = getBaseDate(activateTarget.value)
  const baseStr = base.toISOString().split('T')[0]
  const today = new Date().toISOString().split('T')[0]
  if (baseStr > today) return `从当前到期日 ${baseStr} 起算`
  return '从今天起算'
})

function openActivate(u: any) {
  activateTarget.value = u
  activateForm.value = { plan: 'monthly', expires_at: '' }
  showActivate.value = true
}

async function handleActivate() {
  if (activateForm.value.plan === 'custom' && !activateForm.value.expires_at) {
    showToast('自定义续费请选择到期时间')
    return
  }
  try {
    const data: any = { plan: activateForm.value.plan }
    if (activateForm.value.plan === 'custom') {
      data.expires_at = activateForm.value.expires_at
    }
    await activateUser(activateTarget.value.id, data.plan, data.expires_at || '')
    showToast('已启用')
    showActivate.value = false
    loadUsers(true)
  } catch (err: any) { showToast(err.response?.data?.message || '操作失败') }
}
</script>

<template>
  <div class="page">
    <van-nav-bar title="用户管理" left-text="返回" left-arrow @click-left="$router.back()" />
    <van-search v-model="keyword" placeholder="搜索用户" @search="onSearch" />
    <van-list v-model:loading="loading" :finished="finished" finished-text="已加载全部" @load="loadMore">
      <div v-for="u in users" :key="u.id" class="item" @click="goDetail(u.id)">
        <div class="item-row">
          <div>
            <div class="item-name">{{ u.nickname || '用户' + u.id }}</div>
            <div class="text-secondary">注册 {{ formatDate(u.created_at) }}</div>
          </div>
          <van-tag :type="statusColor(u.subscription_status)" size="medium">
            {{ statusLabel(u.subscription_status) }}
          </van-tag>
        </div>
        <!-- Password row -->
        <div class="pwd-row" @click.stop>
          <span class="pwd-label">密码：</span>
          <span v-if="passwordVisible[u.id]" class="pwd-value">{{ passwordValues[u.id] || '••••••••' }}</span>
          <span v-else class="pwd-masked">••••••••</span>
          <van-loading v-if="passwordLoading[u.id]" size="14px" style="margin-left:6px" />
          <van-button
            v-else
            size="mini"
            :icon="passwordVisible[u.id] ? 'eye-o' : 'closed-eye'"
            @click="togglePassword(u, $event)"
            style="margin-left:6px"
          />
          <van-button
            size="mini"
            type="warning"
            icon="replay"
            @click="openResetPwd(u, $event)"
            style="margin-left:4px"
            title="重置密码"
          />
        </div>
        <div class="item-actions">
          <van-button v-if="u.subscription_status === 'disabled'" size="small" type="success" @click.stop="openActivate(u)">启用</van-button>
          <van-button v-else size="small" type="danger" @click.stop="handleDisable(u)">停用</van-button>
        </div>
      </div>
      <van-empty v-if="!loading && !users.length" description="暂无用户" />
    </van-list>

    <!-- Activate Dialog -->
    <van-dialog v-model:show="showActivate" title="开通/续费" show-cancel-button @confirm="handleActivate">
      <div class="dialog-body">
        <div class="dialog-field">
          <label>续费方式</label>
          <van-radio-group v-model="activateForm.plan" direction="horizontal">
            <van-radio name="custom">自定义</van-radio>
            <van-radio name="monthly">月卡</van-radio>
            <van-radio name="quarterly">季卡</van-radio>
            <van-radio name="yearly">年卡</van-radio>
            <van-radio name="permanent">永久</van-radio>
          </van-radio-group>
        </div>
        <div class="dialog-field" v-if="activateForm.plan === 'custom'">
          <label>到期日期</label>
          <van-field v-model="activateForm.expires_at" placeholder="请选择到期时间" type="date" />
        </div>
        <div class="dialog-field" v-else>
          <div class="calc-preview">{{ calcPreview }}</div>
          <span class="hint">{{ calcHint }}</span>
        </div>
      </div>
    </van-dialog>

    <!-- Reset Password Dialog -->
    <van-dialog v-model:show="showResetPwd" title="重置用户密码" show-cancel-button @confirm="handleResetPwd">
      <div class="dialog-body">
        <p v-if="resetPwdTarget" class="reset-hint">
          为用户 <strong>{{ resetPwdTarget.nickname }}</strong> 设置新密码：
        </p>
        <van-field
          v-model="resetPwdForm.newPassword"
          type="password"
          placeholder="请输入新密码（至少6位）"
        />
        <div v-if="resetPwdDone" class="reset-result">
          <van-tag type="success" size="large">新密码：{{ resetPwdDone }}</van-tag>
        </div>
      </div>
    </van-dialog>
  </div>
</template>

<style scoped>
.page { background: #f7f8fa; min-height: 100vh; }
.item { background: #fff; border-radius: 8px; margin: 8px 12px; padding: 14px; }
.item-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; }
.item-name { font-size: 15px; font-weight: 600; }
.text-secondary { color: #969799; font-size: 12px; margin-top: 2px; }
.pwd-row {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  padding: 6px 0;
  border-top: 1px solid #f5f5f5;
  border-bottom: 1px solid #f5f5f5;
}
.pwd-label { font-size: 12px; color: #969799; margin-right: 4px; }
.pwd-masked { font-size: 14px; color: #323233; letter-spacing: 2px; }
.pwd-value { font-size: 14px; color: #1989fa; font-weight: 600; }
.item-actions { display: flex; gap: 8px; justify-content: flex-end; }
.dialog-body { padding: 20px 16px; }
.dialog-field { margin-bottom: 16px; }
.dialog-field label { display: block; font-size: 14px; font-weight: 600; margin-bottom: 10px; }
.calc-preview { font-size: 14px; color: #2563eb; font-weight: 500; padding: 8px 0; }
.hint { display: block; font-size: 11px; color: #969799; margin-top: 4px; }
.reset-hint { margin-bottom: 12px; font-size: 14px; color: #64748b; }
.reset-result { margin-top: 12px; text-align: center; }
</style>
