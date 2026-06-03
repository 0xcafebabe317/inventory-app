<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { showToast } from 'vant'
import { getCustomerLedger } from '../api/customer'
import { createRepayment } from '../api/repayment'
import { formatMoney, formatDateTime } from '../utils/format'

const route = useRoute()
const customerId = Number(route.params.id)

const customer = ref<any>({})
const totalCredit = ref(0)
const totalRepaid = ref(0)
const balance = ref(0)
const transactions = ref<any[]>([])
const showRepay = ref(false)
const repayAmount = ref('')
const repayMethod = ref('cash')
const submitting = ref(false)

onMounted(() => loadLedger())

async function loadLedger() {
  try {
    const res: any = await getCustomerLedger(customerId)
    customer.value = res.data.customer
    totalCredit.value = res.data.total_credit || 0
    totalRepaid.value = res.data.total_repaid || 0
    balance.value = res.data.balance || 0
    transactions.value = res.data.transactions || []
  } catch { /* */ }
}

async function submitRepay() {
  const amount = parseFloat(repayAmount.value)
  if (!amount || amount <= 0) { showToast('请输入金额'); return }
  submitting.value = true
  try {
    await createRepayment({ customer_id: customerId, amount, pay_method: repayMethod.value })
    showToast('还款记录成功')
    showRepay.value = false
    repayAmount.value = ''
    loadLedger()
  } catch (err: any) {
    showToast(err.response?.data?.message || '还款失败')
  } finally { submitting.value = false }
}
</script>

<template>
  <div class="page">
    <van-nav-bar title="客户详情" left-text="返回" left-arrow @click-left="$router.back()" />

    <!-- Balance -->
    <div class="balance-card">
      <div>{{ customer.name }}</div>
      <div>{{ customer.phone || '' }}</div>
      <div class="balance-amount" :class="{ 'text-green': balance === 0 }">
        ¥{{ formatMoney(balance) }}
      </div>
      <div class="text-secondary">待还金额</div>
    </div>

    <!-- Actions -->
    <div style="display: flex; gap: 8px; padding: 0 12px 12px">
      <van-button round block type="primary" @click="showRepay = true">记录还款</van-button>
    </div>

    <!-- Transaction History -->
    <div class="card">
      <div class="card-title">交易记录</div>
      <div v-if="!transactions.length" class="empty">暂无记录</div>
      <div v-for="t in transactions" :key="t.id" class="tx-item">
        <div class="tx-row">
          <van-tag :type="t.type === 'sale' ? 'warning' : 'success'" size="mini">
            {{ t.type === 'sale' ? '赊账出库' : '还款' }}
          </van-tag>
          <span :class="t.type === 'sale' ? 'text-danger' : 'text-green'">
            {{ t.type === 'sale' ? '-' : '+' }}¥{{ formatMoney(t.amount) }}
          </span>
        </div>
        <div class="tx-date">{{ formatDateTime(t.date || t.created_at) }}</div>
      </div>
    </div>

    <!-- Repay Dialog -->
    <van-popup v-model:show="showRepay" position="bottom" :style="{ padding: '20px' }" round>
      <h4 style="margin: 0 0 16px">记录还款</h4>
      <van-field v-model="repayAmount" type="digit" label="金额" placeholder="请输入还款金额" />
      <div style="margin: 12px 0">
        <span style="font-size:14px;margin-right:10px">方式</span>
        <van-button v-for="m in [{l:'微信',v:'wechat'},{l:'支付宝',v:'alipay'},{l:'现金',v:'cash'}]" :key="m.v"
          :type="repayMethod === m.v ? 'primary' : 'default'" size="small" @click="repayMethod = m.v">{{ m.l }}</van-button>
      </div>
      <van-button round block type="primary" :loading="submitting" @click="submitRepay">确认还款</van-button>
    </van-popup>
  </div>
</template>

<style scoped>
.page { background: #f7f8fa; min-height: 100vh; }
.balance-card {
  background: #fff; text-align: center; padding: 24px; margin: 12px; border-radius: 8px;
}
.balance-amount { font-size: 32px; font-weight: 700; color: #ee0a24; margin: 8px 0; }
.text-green { color: #07c160 !important; }
.text-danger { color: #ee0a24; font-weight: 600; }
.card { background: #fff; border-radius: 8px; margin: 12px; padding: 14px; }
.card-title { font-size: 15px; font-weight: 600; margin-bottom: 10px; }
.tx-item { padding: 10px 0; border-bottom: 1px solid #f5f5f5; }
.tx-item:last-child { border-bottom: none; }
.tx-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.tx-date { font-size: 12px; color: #969799; }
.empty { text-align: center; color: #969799; padding: 24px; }
.text-secondary { color: #969799; font-size: 13px; }
</style>
