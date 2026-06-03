<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getAdminDashboard } from '../../api/admin'
import { formatMoney, formatDate } from '../../utils/format'

const router = useRouter()
const dashboard = ref<any>({})
onMounted(async () => {
  try { const res: any = await getAdminDashboard(); dashboard.value = res.data || {} } catch { /* */ }
})
</script>

<template>
  <div class="page">
    <h2 class="page-title">概览</h2>

    <div class="kpi-grid">
      <div class="kpi-card"><div class="kpi-val">{{ dashboard.user_count || 0 }}</div><div class="kpi-label">用户数</div></div>
      <div class="kpi-card"><div class="kpi-val">{{ dashboard.product_count || 0 }}</div><div class="kpi-label">商品数</div></div>
      <div class="kpi-card"><div class="kpi-val">¥{{ formatMoney(dashboard.today_sales || 0) }}</div><div class="kpi-label">今日销售</div></div>
      <div class="kpi-card"><div class="kpi-val">¥{{ formatMoney(dashboard.month_sales || 0) }}</div><div class="kpi-label">本月销售</div></div>
    </div>

    <div class="card">
      <div class="card-title">本月利润</div>
      <div class="big-num">¥{{ formatMoney(dashboard.month_profit || 0) }}</div>
    </div>

    <!-- Expiring Users -->
    <div class="card" v-if="dashboard.expiring_users?.length">
      <div class="card-title">即将到期用户 (7天内)</div>
      <div v-for="u in dashboard.expiring_users" :key="u.id" class="expiring-row" @click="router.push('/user-detail/' + u.id)">
        <div>
          <span class="expiring-name">{{ u.nickname || '用户' }}</span>
          <span class="expiring-phone">{{ u.phone }}</span>
        </div>
        <span class="text-secondary">{{ formatDate(u.subscription_expires_at) }} 到期</span>
      </div>
    </div>

    <div class="card" v-if="dashboard.low_stock_count">
      <div class="card-title">低库存预警</div>
      <p class="text-secondary">{{ dashboard.low_stock_count }} 件商品库存不足</p>
    </div>
  </div>
</template>

<style scoped>
.page { background: #f7f8fa; min-height: 100vh; padding-bottom: 50px; }
.page-title { font-size: 22px; font-weight: 700; padding: 16px 16px 8px; }
.kpi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 0 12px; margin-bottom: 12px; }
.kpi-card { background: #fff; border-radius: 8px; padding: 16px; text-align: center; }
.kpi-val { font-size: 22px; font-weight: 700; color: #1989fa; }
.kpi-label { font-size: 12px; color: #969799; margin-top: 4px; }
.card { background: #fff; border-radius: 8px; margin: 8px 12px; padding: 14px; }
.card-title { font-size: 15px; font-weight: 600; margin-bottom: 6px; }
.big-num { font-size: 28px; font-weight: 700; color: #07c160; }
.expiring-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 0; border-top: 1px solid #f5f5f5; cursor: pointer;
}
.expiring-name { font-size: 14px; font-weight: 600; }
.expiring-phone { font-size: 12px; color: #646566; margin-left: 8px; }
.text-secondary { color: #969799; font-size: 13px; }
</style>
