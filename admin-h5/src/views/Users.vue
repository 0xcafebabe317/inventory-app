<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import { getUsers, activateUser, disableUser } from '../api/admin'
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
    await showConfirmDialog({ title: '确认停用', message: `确定要停用「${u.nickname || u.phone}」吗？` })
    await disableUser(u.id)
    showToast('已停用')
    loadUsers(true)
  } catch { /* cancelled */ }
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
            <div class="text-secondary">{{ u.phone }} · 注册 {{ formatDate(u.created_at) }}</div>
          </div>
          <van-tag :type="statusColor(u.subscription_status)" size="medium">
            {{ statusLabel(u.subscription_status) }}
          </van-tag>
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
  </div>
</template>

<style scoped>
.page { background: #f7f8fa; min-height: 100vh; }
.item { background: #fff; border-radius: 8px; margin: 8px 12px; padding: 14px; }
.item-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
.item-name { font-size: 15px; font-weight: 600; }
.text-secondary { color: #969799; font-size: 12px; margin-top: 2px; }
.item-actions { display: flex; gap: 8px; justify-content: flex-end; }
.dialog-body { padding: 20px 16px; }
.dialog-field { margin-bottom: 16px; }
.dialog-field label { display: block; font-size: 14px; font-weight: 600; margin-bottom: 10px; }
.calc-preview { font-size: 14px; color: #2563eb; font-weight: 500; padding: 8px 0; }
.hint { display: block; font-size: 11px; color: #969799; margin-top: 4px; }
</style>
