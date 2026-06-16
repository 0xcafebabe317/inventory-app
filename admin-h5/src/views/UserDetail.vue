<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { showToast } from 'vant'
import { getUser, activateUser, disableUser } from '../api/admin'
import { formatDate, statusLabel, statusColor, planLabel } from '../utils/format'

const route = useRoute()
const user = ref<any>({})
const loading = ref(true)
const showActivate = ref(false)
const activateForm = ref({ plan: 'monthly', expires_at: '' })

onMounted(() => loadUser())

async function loadUser() {
  loading.value = true
  try {
    const res: any = await getUser(Number(route.params.id))
    user.value = res.data?.user || res.data
  } catch { showToast('加载失败') }
  loading.value = false
}

function getBaseDate(): Date {
  if (user.value?.subscription_expires_at) {
    const d = new Date(user.value.subscription_expires_at)
    if (d > new Date()) return d
  }
  return new Date()
}

const calcPreview = computed(() => {
  if (activateForm.value.plan === 'custom') return ''
  if (activateForm.value.plan === 'permanent') return '永久有效'
  const base = getBaseDate()
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
  const base = getBaseDate()
  const baseStr = base.toISOString().split('T')[0]
  const today = new Date().toISOString().split('T')[0]
  if (baseStr > today) return `从当前到期日 ${baseStr} 起算`
  return '从今天起算'
})

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
    await activateUser(user.value.id, data.plan, data.expires_at || '')
    showToast('已启用')
    showActivate.value = false
    loadUser()
  } catch (err: any) { showToast(err.response?.data?.message || '操作失败') }
}

async function handleDisable() {
  try {
    await disableUser(user.value.id)
    showToast('已禁用')
    loadUser()
  } catch (err: any) { showToast(err.response?.data?.message || '操作失败') }
}
</script>

<template>
  <div class="page">
    <van-nav-bar title="用户详情" left-text="返回" left-arrow @click-left="$router.back()" />
    <van-loading v-if="loading" class="loading" />
    <template v-if="!loading && user.id">
      <div class="card">
        <div class="info-row">
          <span>昵称：{{ user.nickname || '未设置' }}</span>
          <van-tag :type="statusColor(user.subscription_status)">{{ statusLabel(user.subscription_status) }}</van-tag>
        </div>
        <div class="info-row"><span>昵称</span><span>{{ user.nickname }}</span></div>
        <div class="info-row"><span>订阅方案</span><span>{{ planLabel(user.subscription_plan) }}</span></div>
        <div class="info-row"><span>试用开始</span><span>{{ formatDate(user.trial_start_at) }}</span></div>
        <div class="info-row" v-if="user.subscription_expires_at">
          <span>订阅到期</span><span>{{ formatDate(user.subscription_expires_at) }}</span>
        </div>
        <div class="info-row"><span>注册时间</span><span>{{ formatDate(user.created_at) }}</span></div>
      </div>
      <div class="actions">
        <van-button v-if="user.subscription_status === 'disabled'" round block type="success" @click="showActivate = true">启用用户</van-button>
        <van-button v-if="user.subscription_status !== 'disabled'" round block type="danger" @click="handleDisable">禁用用户</van-button>
      </div>
    </template>

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
  </div>
</template>

<style scoped>
.page { background: #f7f8fa; min-height: 100vh; }
.loading { display: flex; justify-content: center; padding: 40px; }
.card { background: #fff; border-radius: 8px; margin: 12px; padding: 14px; }
.info-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f5f5f5; font-size: 14px; }
.info-row:last-child { border-bottom: none; }
.actions { margin: 20px 16px; display: flex; gap: 12px; }
.dialog-body { padding: 20px 16px; }
.dialog-field { margin-bottom: 16px; }
.dialog-field label { display: block; font-size: 14px; font-weight: 600; margin-bottom: 10px; }
.calc-preview { font-size: 14px; color: #2563eb; font-weight: 500; padding: 8px 0; }
.hint { display: block; font-size: 11px; color: #969799; margin-top: 4px; }
</style>
