<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getCustomerLedger } from '../api/admin'
import { formatMoney, formatDateTime } from '../utils/format'

const route = useRoute()
const customerId = ref(Number(route.params.id))
const customer = ref<any>({})
const transactions = ref<any[]>([])
const loading = ref(true)

onMounted(() => loadLedger())

watch(() => route.params.id, (id) => {
  customerId.value = Number(id)
  loadLedger()
})

async function loadLedger() {
  loading.value = true
  try {
    const res: any = await getCustomerLedger(customerId.value)
    const data = res.data || {}
    customer.value = data.customer || {}
    transactions.value = data.transactions || data.list || []
  } catch { /* */ }
  loading.value = false
}
</script>

<template>
  <div class="page">
    <van-nav-bar title="客户详情" left-text="返回" left-arrow @click-left="$router.back()" />
    <van-loading v-if="loading" class="loading" />

    <template v-if="!loading && customer.id">
      <div class="card header-card">
        <div class="customer-name">{{ customer.name }}</div>
        <div class="text-secondary">{{ customer.phone || '' }}</div>
        <div class="balance" :class="{ red: (customer.balance || 0) > 0 }">
          应收余额 ¥{{ formatMoney(customer.balance || 0) }}
        </div>
      </div>

      <div class="card">
        <div class="card-title">交易记录</div>
        <div v-for="tx in transactions" :key="tx.id" class="tx-item">
          <div class="tx-row">
            <van-tag :type="tx.type === 'repayment' ? 'success' : 'warning'" size="mini">
              {{ tx.type === 'repayment' ? '还款' : '赊账' }}
            </van-tag>
            <span :class="tx.type === 'repayment' ? 'green' : 'red'">
              {{ tx.type === 'repayment' ? '+' : '-' }}¥{{ formatMoney(tx.amount) }}
            </span>
          </div>
          <div class="text-secondary">{{ formatDateTime(tx.created_at) }}</div>
        </div>
        <van-empty v-if="!transactions.length" description="暂无交易" />
      </div>
    </template>

    <van-empty v-if="!loading && !customer.id" description="客户不存在" />
  </div>
</template>

<style scoped>
.page { background: #f7f8fa; min-height: 100vh; }
.loading { display: flex; justify-content: center; padding: 40px; }
.card { background: #fff; border-radius: 8px; margin: 12px; padding: 14px; }
.header-card { text-align: center; }
.customer-name { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
.balance { font-size: 18px; font-weight: 700; margin-top: 8px; }
.balance.red { color: #ee0a24; }
.card-title { font-size: 15px; font-weight: 600; margin-bottom: 10px; }
.tx-item { padding: 10px 0; border-bottom: 1px solid #f5f5f5; }
.tx-item:last-child { border-bottom: none; }
.tx-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.green { color: #07c160; font-weight: 600; }
.red { color: #ee0a24; font-weight: 600; }
.text-secondary { color: #969799; font-size: 12px; }
</style>
