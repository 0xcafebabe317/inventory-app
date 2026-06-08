<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getStockLog } from '../api/admin'
import { formatDateTime } from '../utils/format'

const route = useRoute()
const productId = Number(route.params.id)
const logs = ref<any[]>([])
const loading = ref(false)
const finished = ref(false)
const page = ref(1)

onMounted(() => loadLogs())

async function loadLogs() {
  loading.value = true
  try {
    const res: any = await getStockLog(productId, page.value)
    const list = res.data?.list || []
    if (page.value === 1) logs.value = list
    else logs.value.push(...list)
    if (list.length < 20) finished.value = true
  } catch { /* */ }
  loading.value = false
}

function loadMore() { if (finished.value) return; page.value++; loadLogs() }

function typeLabel(t: string) {
  const map: Record<string, string> = { in: '入库', out: '出库', refund_back: '退货回退' }
  return map[t] || t
}

function typeColor(t: string): 'success' | 'danger' | 'primary' {
  const map: Record<string, 'success' | 'danger' | 'primary'> = { in: 'success', out: 'danger', refund_back: 'primary' }
  return map[t] || 'primary'
}
</script>

<template>
  <div class="page">
    <van-nav-bar title="库存流水" left-text="返回" left-arrow @click-left="$router.back()" />
    <van-list v-model:loading="loading" :finished="finished" finished-text="已加载全部" @load="loadMore">
      <div v-for="log in logs" :key="log.id" class="log-item">
        <div class="log-row">
          <van-tag :type="typeColor(log.type)" size="medium">{{ typeLabel(log.type) }}</van-tag>
          <span class="log-qty">×{{ log.qty }}</span>
        </div>
        <div class="log-change">
          <span>{{ log.before_qty }}</span>
          <van-icon name="arrow" />
          <span>{{ log.after_qty }}</span>
        </div>
        <div class="text-secondary">{{ formatDateTime(log.created_at) }}</div>
      </div>
      <van-empty v-if="!loading && !logs.length" description="暂无流水" />
    </van-list>
  </div>
</template>

<style scoped>
.page { background: #f7f8fa; min-height: 100vh; }
.log-item { background: #fff; border-radius: 8px; margin: 8px 12px; padding: 14px; }
.log-row { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.log-qty { font-size: 18px; font-weight: 700; }
.log-change { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; font-size: 14px; color: #646566; }
.text-secondary { color: #969799; font-size: 12px; }
</style>
