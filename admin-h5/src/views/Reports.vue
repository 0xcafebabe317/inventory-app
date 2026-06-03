<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { showToast } from 'vant'
import { getSummary, getProfit, getInventoryReport, exportProducts, exportSales } from '../api/admin'
import { formatMoney } from '../utils/format'

const summary = ref<any>({})
const profit = ref<any>({})
const inventory = ref<any>({})
const exporting = ref('')

onMounted(async () => {
  try { summary.value = (await getSummary() as any).data || {} } catch { /* */ }
  try { profit.value = (await getProfit({}) as any).data || {} } catch { /* */ }
  try { inventory.value = (await getInventoryReport() as any).data || {} } catch { /* */ }
})

async function handleExport(type: string) {
  exporting.value = type
  try {
    let blob: Blob
    if (type === 'products') {
      const res: any = await exportProducts()
      blob = new Blob([res], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    } else {
      const res: any = await exportSales({})
      blob = new Blob([res], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    }
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${type}_${new Date().toISOString().slice(0, 10)}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
    showToast('导出成功')
  } catch { showToast('导出失败') }
  exporting.value = ''
}
</script>

<template>
  <div class="page">
    <van-nav-bar title="报表中心" left-text="返回" left-arrow @click-left="$router.back()" />

    <div class="card">
      <div class="card-title">经营概览</div>
      <div class="kpi-row">
        <div class="kpi-item"><div class="kpi-val">¥{{ formatMoney(summary.today_sales || 0) }}</div><div class="kpi-label">今日销售</div></div>
        <div class="kpi-item"><div class="kpi-val">¥{{ formatMoney(summary.month_sales || 0) }}</div><div class="kpi-label">本月销售</div></div>
        <div class="kpi-item"><div class="kpi-val">¥{{ formatMoney(profit.month_profit || 0) }}</div><div class="kpi-label">本月利润</div></div>
      </div>
    </div>

    <div class="card" v-if="inventory.low_stock_count">
      <div class="card-title">低库存商品</div>
      <p class="text-secondary">{{ inventory.low_stock_count }} 件商品库存不足</p>
    </div>

    <div class="card">
      <div class="card-title">数据导出</div>
      <div class="export-btns">
        <van-button size="small" type="primary" :loading="exporting === 'products'" @click="handleExport('products')">导出商品</van-button>
        <van-button size="small" type="success" :loading="exporting === 'sales'" @click="handleExport('sales')">导出销售</van-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { background: #f7f8fa; min-height: 100vh; }
.card { background: #fff; border-radius: 8px; margin: 12px; padding: 14px; }
.card-title { font-size: 15px; font-weight: 600; margin-bottom: 10px; }
.kpi-row { display: flex; gap: 12px; }
.kpi-item { flex: 1; text-align: center; }
.kpi-val { font-size: 18px; font-weight: 700; color: #1989fa; }
.kpi-label { font-size: 12px; color: #969799; margin-top: 4px; }
.export-btns { display: flex; gap: 12px; }
.text-secondary { color: #969799; font-size: 13px; }
</style>
