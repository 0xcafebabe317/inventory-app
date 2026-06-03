<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useAuthStore } from '../../stores/auth'
import { getSummary } from '../../api/report'
import { getCustomers } from '../../api/customer'
import { formatMoney, formatDate, payMethodLabel } from '../../utils/format'

const router = useRouter()
const auth = useAuthStore()
const loading = ref(true)

const stats = ref({
  todaySales: 0, todayProfit: 0,
  monthSales: 0, monthProfit: 0,
  totalAr: 0, lowStockCount: 0
})
const todaySalesList = ref<any[]>([])
const customersWithDebt = ref<any[]>([])

const statCards = [
  { label: '今日销售', key: 'todaySales', color: '#2563eb', bg: '#eff6ff', icon: '💰' },
  { label: '今日利润', key: 'todayProfit', color: '#16a34a', bg: '#f0fdf4', icon: '📈' },
  { label: '本月销售', key: 'monthSales', color: '#f59e0b', bg: '#fffbeb', icon: '📊' },
  { label: '本月利润', key: 'monthProfit', color: '#8b5cf6', bg: '#f5f3ff', icon: '✨' }
]

onMounted(() => loadData())

async function loadData() {
  loading.value = true
  try {
    const [summaryRes, customersRes]: any[] = await Promise.all([
      getSummary(), getCustomers()
    ])
    const s = summaryRes.data
    stats.value = {
      todaySales: s.today_sales || 0,
      todayProfit: s.today_profit || 0,
      monthSales: s.month_sales || 0,
      monthProfit: s.month_profit || 0,
      totalAr: s.total_ar || 0,
      lowStockCount: s.low_stock_count || 0
    }
    todaySalesList.value = (s.today_sales_list || []).slice(0, 5)
    customersWithDebt.value = (customersRes.data || [])
      .filter((c: any) => c.balance > 0)
      .sort((a: any, b: any) => b.balance - a.balance)
  } catch {
    showToast('加载失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="page">
    <!-- Trial banner -->
    <div v-if="auth.trialDaysLeft > 0 && auth.trialDaysLeft <= 3" class="trial-banner">
      ⏰ 试用期还剩 {{ auth.trialDaysLeft }} 天
    </div>

    <!-- KPI Stats -->
    <div class="stats-grid">
      <div v-for="card in statCards" :key="card.key" class="stat-card" :style="{ borderTopColor: card.color }">
        <div class="stat-top">
          <span class="stat-icon">{{ card.icon }}</span>
          <span class="stat-label">{{ card.label }}</span>
        </div>
        <div class="stat-value" :style="{ color: card.color }">
          ¥{{ formatMoney((stats as any)[card.key]) }}
        </div>
      </div>
    </div>

    <!-- Accounts Receivable -->
    <div v-if="customersWithDebt.length" class="card ar-card" @click="router.push({ name: 'CustomerDetail', params: { id: customersWithDebt[0].id } })">
      <div class="card-title">
        <span>💳 应收账款</span>
        <van-tag type="danger" size="small">{{ customersWithDebt.length }}人</van-tag>
      </div>
      <div class="ar-total">¥{{ formatMoney(stats.totalAr) }}</div>
      <div v-for="c in customersWithDebt.slice(0, 5)" :key="c.id" class="ar-item">
        <span>{{ c.name }}</span>
        <span class="text-danger">¥{{ formatMoney(c.balance) }}</span>
      </div>
    </div>

    <!-- Today Sales -->
    <div class="card">
      <div class="card-title" style="cursor:pointer" @click="router.push({ name: 'TodaySales' })">
        <span>📋 今日销售</span>
        <van-icon name="arrow" size="14" color="#969799" />
      </div>
      <div v-if="!todaySalesList.length" class="empty">暂无销售记录</div>
      <div v-for="sale in todaySalesList" :key="sale.id" class="sale-item" @click="router.push({ name: 'SaleDetail', params: { id: sale.id } })">
        <div class="sale-row">
          <span class="sale-customer">{{ sale.customer?.name || '散客' }}</span>
          <span class="sale-amount">¥{{ formatMoney(sale.total_amount) }}</span>
        </div>
        <div class="sale-meta">
          <van-tag :type="sale.pay_method === 'credit' ? 'warning' : 'success'" size="mini">
            {{ payMethodLabel(sale.pay_method) }}
          </van-tag>
          <span class="text-secondary">{{ formatDate(sale.created_at) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { padding: 12px; padding-bottom: 60px; }
.trial-banner {
  background: linear-gradient(135deg, #fff7e6, #ffe8cc);
  color: #e67e22; text-align: center;
  padding: 10px; border-radius: 10px; margin-bottom: 14px; font-size: 14px; font-weight: 500;
}

/* Stats */
.stats-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;
}
.stat-card {
  background: #fff; border-radius: 10px; padding: 16px;
  border-top: 3px solid; box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
.stat-top { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
.stat-icon { font-size: 18px; }
.stat-label { font-size: 12px; color: #969799; }
.stat-value { font-size: 22px; font-weight: 700; }

/* Cards */
.card {
  background: #fff; border-radius: 10px; padding: 16px; margin-bottom: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
.card-title { font-size: 15px; font-weight: 600; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }

/* AR */
.ar-total { font-size: 28px; font-weight: 700; color: #ee0a24; margin-bottom: 10px; }
.ar-item { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; border-top: 1px solid #f7f7f7; }

/* Sales */
.sale-item { padding: 12px 0; border-bottom: 1px solid #f7f7f7; cursor: pointer; }
.sale-item:last-child { border-bottom: none; }
.sale-row { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 14px; }
.sale-customer { font-weight: 500; }
.sale-amount { font-weight: 700; font-size: 15px; }
.sale-meta { display: flex; align-items: center; gap: 8px; }

.empty { text-align: center; color: #969799; padding: 24px 0; font-size: 14px; }

.text-danger { color: #ee0a24; font-weight: 500; }
.text-secondary { color: #969799; font-size: 12px; }
</style>
