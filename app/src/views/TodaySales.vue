<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getSales } from '../api/sale'
import { formatMoney, formatDateTime, payMethodLabel } from '../utils/format'

const router = useRouter()
const sales = ref<any[]>([])
const loading = ref(false)
const finished = ref(false)
const page = ref(1)

// Get today's date string in YYYY-MM-DD format (local time)
function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

onMounted(() => loadSales())

async function loadSales() {
  loading.value = true
  try {
    const today = todayStr()
    const res: any = await getSales({ page: page.value, page_size: 20, start_date: today, end_date: today })
    const list = res.data?.list || []
    if (page.value === 1) sales.value = list
    else sales.value.push(...list)
    if (list.length < 20) finished.value = true
  } catch { /* */ }
  loading.value = false
}

function loadMore() {
  if (finished.value) return
  page.value++
  loadSales()
}
</script>

<template>
  <div class="page">
    <van-nav-bar title="今日销售" left-text="返回" left-arrow @click-left="$router.back()" />

    <van-list v-model:loading="loading" :finished="finished" finished-text="已加载全部" @load="loadMore">
      <div v-for="sale in sales" :key="sale.id" class="sale-card" @click="router.push({ name: 'SaleDetail', params: { id: sale.id } })">
        <div class="sale-row">
          <div>
            <span class="sale-customer">{{ sale.customer?.name || '散客' }}</span>
            <van-tag :type="sale.pay_method === 'wechat' ? 'success' : sale.pay_method === 'alipay' ? 'primary' : 'default'" size="mini" style="margin-left:6px">
              {{ payMethodLabel(sale.pay_method) }}
            </van-tag>
          </div>
          <span class="sale-amount">¥{{ formatMoney(sale.total_amount) }}</span>
        </div>
        <div class="sale-items" v-if="sale.items?.length">
          共 {{ sale.items.length }} 种商品 · {{ sale.items.reduce((s: number, i: any) => s + i.qty, 0) }} 件
        </div>
        <div class="text-secondary">{{ formatDateTime(sale.created_at) }}</div>
      </div>

      <van-empty v-if="!loading && !sales.length" description="今日暂无销售" />
    </van-list>
  </div>
</template>

<style scoped>
.page { background: #f7f8fa; min-height: 100vh; }
.sale-card {
  background: #fff; border-radius: 10px; margin: 8px 12px; padding: 14px 16px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04); cursor: pointer;
}
.sale-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.sale-customer { font-size: 16px; font-weight: 600; }
.sale-amount { font-size: 18px; font-weight: 700; color: #323233; }
.sale-items { font-size: 13px; color: #646566; margin-bottom: 4px; }
.text-secondary { color: #969799; font-size: 12px; }
</style>
