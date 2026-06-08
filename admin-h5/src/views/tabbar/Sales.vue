<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getSales } from '../../api/admin'
import { formatMoney, formatDateTime, payMethodLabel, statusLabel, statusColor } from '../../utils/format'

const router = useRouter()
const sales = ref<any[]>([])
const loading = ref(false)
const finished = ref(false)
const page = ref(1)
const activeTab = ref('all')

onMounted(() => loadSales())

async function loadSales(reset = false) {
  if (reset) { page.value = 1; sales.value = [] }
  loading.value = true
  try {
    const params: any = { page: page.value, page_size: 20 }
    if (activeTab.value !== 'all') params.status = activeTab.value
    const res: any = await getSales(params)
    const list = res.data?.list || []
    if (reset) sales.value = list
    else sales.value.push(...list)
    if (list.length < 20) finished.value = true
  } catch { /* */ }
  loading.value = false
}

function loadMore() { if (finished.value) return; page.value++; loadSales() }
function onTabChange() { finished.value = false; loadSales(true) }
function goDetail(id: number) { router.push(`/sale-detail/${id}`) }
</script>

<template>
  <div class="page">
    <van-nav-bar title="销售订单" />
    <van-tabs v-model:active="activeTab" @change="onTabChange">
      <van-tab title="全部" name="all" />
      <van-tab title="已完成" name="completed" />
      <van-tab title="已退货" name="refunded" />
    </van-tabs>

    <van-list v-model:loading="loading" :finished="finished" finished-text="已加载全部" @load="loadMore">
      <div v-for="s in sales" :key="s.id" class="item" @click="goDetail(s.id)">
        <div class="item-row">
          <span class="item-no">#{{ s.id }}</span>
          <van-tag :type="statusColor(s.status)" size="medium">{{ statusLabel(s.status) }}</van-tag>
        </div>
        <div class="item-row">
          <span class="text-secondary">{{ s.customer?.name || '散客' }}</span>
          <span>{{ payMethodLabel(s.pay_method) }}</span>
        </div>
        <div class="item-row">
          <span class="text-secondary">{{ formatDateTime(s.created_at) }}</span>
          <span class="amount">¥{{ formatMoney(s.total_amount) }}</span>
        </div>
      </div>

      <van-empty v-if="!loading && !sales.length" description="暂无订单" />
    </van-list>
  </div>
</template>

<style scoped>
.page { background: #f7f8fa; min-height: 100vh; padding-bottom: 50px; }
.item { background: #fff; border-radius: 8px; margin: 8px 12px; padding: 14px; }
.item-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.item-row:last-child { margin-bottom: 0; }
.item-no { font-weight: 600; }
.amount { font-size: 17px; font-weight: 700; color: #ee0a24; }
.text-secondary { color: #969799; font-size: 12px; }
</style>
