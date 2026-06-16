<script setup lang="ts">
import { ref } from 'vue'
import { getOperationLogs } from '../api/admin'
import { formatDateTime, planLabel } from '../utils/format'

const logs = ref<any[]>([])
const loading = ref(false)
const finished = ref(false)
const page = ref(1)

async function onLoad() {
  loading.value = true
  try {
    const res: any = await getOperationLogs(page.value)
    const list = res.data?.list || []
    if (page.value === 1) logs.value = list
    else logs.value.push(...list)
    if (list.length < 10) finished.value = true
    else page.value++
  } catch { /* */ }
  loading.value = false
}

function actionLabel(a: string) {
  const map: Record<string, string> = {
    activate: '开通', renew: '续费', disable: '停用'
  }
  return map[a] || a
}

function actionColor(a: string): 'success' | 'primary' | 'danger' {
  const map: Record<string, 'success' | 'primary' | 'danger'> = {
    activate: 'success', renew: 'primary', disable: 'danger'
  }
  return map[a] || 'primary'
}
</script>

<template>
  <div class="page">
    <van-nav-bar title="操作日志" left-text="返回" left-arrow @click-left="$router.back()" />
    <van-list v-model:loading="loading" :finished="finished" finished-text="已加载全部" @load="onLoad">
      <div v-for="log in logs" :key="log.id" class="item">
        <div class="item-row">
          <van-tag :type="actionColor(log.action)" size="medium">{{ actionLabel(log.action) }}</van-tag>
          <span class="text-secondary">{{ formatDateTime(log.created_at) }}</span>
        </div>
        <div class="item-info">
          <span>目标用户：{{ log.user_nickname || '用户'+log.user_id }}</span>
          <span>操作人：{{ log.admin_name || '管理员'+log.admin_id }}</span>
          <span v-if="log.plan">套餐：{{ planLabel(log.plan) }}</span>
          <span v-if="log.remark">备注：{{ log.remark }}</span>
        </div>
      </div>
      <van-empty v-if="!loading && !logs.length" description="暂无日志" />
    </van-list>
  </div>
</template>

<style scoped>
.page { background: #f7f8fa; min-height: 100vh; }
.item { background: #fff; border-radius: 8px; margin: 8px 12px; padding: 14px; }
.item-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.item-info { font-size: 12px; color: #646566; display: flex; gap: 12px; }
.text-secondary { color: #969799; font-size: 12px; }
</style>
