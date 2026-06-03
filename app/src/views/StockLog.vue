<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getStockLog } from '../api/product'
import { formatDateTime, formatMoney } from '../utils/format'

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

function loadMore() {
  if (finished.value) return
  page.value++
  loadLogs()
}

function typeLabel(t: string) {
  const map: Record<string, string> = { in: '入库', out: '出库', refund_back: '退货回退' }
  return map[t] || t
}

function typeColor(t: string) {
  const map: Record<string, string> = { in: 'success', out: 'danger', refund_back: 'primary' }
  return map[t] || 'default'
}

function refLabel(refType: string) {
  const map: Record<string, string> = { purchase: '进货入库', sale: '销售出库', refund: '退货', adjust: '库存调整' }
  return map[refType] || refType
}

function logDetail(log: any) {
  if (log.ref_type === 'purchase' || log.ref_type === 'in') {
    const supplier = log.supplier_name ? `供应商：${log.supplier_name}` : ''
    const price = log.unit_price ? `单价：¥${formatMoney(log.unit_price)}` : ''
    const total = log.order_total ? `总价：¥${formatMoney(log.order_total)}` : ''
    return [supplier, price, total].filter(Boolean).join(' · ')
  }
  if (log.ref_type === 'sale' || log.ref_type === 'refund' || log.type === 'out' || log.type === 'refund_back') {
    const customer = log.customer_name ? `客户：${log.customer_name}` : '散客'
    const price = log.unit_price ? `单价：¥${formatMoney(log.unit_price)}` : ''
    const total = log.order_total ? `总价：¥${formatMoney(log.order_total)}` : ''
    return [customer, price, total].filter(Boolean).join(' · ')
  }
  return ''
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
          <span class="log-ref-type">{{ refLabel(log.ref_type) }}</span>
        </div>
        <div class="log-detail" v-if="logDetail(log)">{{ logDetail(log) }}</div>
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
.log-item {
  background: #fff; border-radius: 8px; margin: 8px 12px; padding: 14px;
}
.log-row { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.log-qty { font-size: 18px; font-weight: 700; }
.log-ref-type { font-size: 12px; color: #646566; background: #f2f3f5; padding: 2px 8px; border-radius: 4px; }
.log-detail { font-size: 13px; color: #646566; margin-bottom: 6px; line-height: 1.5; }
.log-change { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; font-size: 14px; color: #323233; }
.text-secondary { color: #969799; font-size: 12px; }
</style>
