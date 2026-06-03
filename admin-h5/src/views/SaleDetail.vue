<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import { getSale, refundSale } from '../api/admin'
import { formatMoney, formatDateTime, payMethodLabel } from '../utils/format'

const route = useRoute()
const saleId = Number(route.params.id)
const order = ref<any>({})
const loading = ref(true)

onMounted(() => loadOrder())

async function loadOrder() {
  loading.value = true
  try { const res: any = await getSale(saleId); order.value = res.data } catch { showToast('加载失败') }
  loading.value = false
}

async function handleRefund() {
  try {
    await showConfirmDialog({ title: '确认退货', message: '确定为此订单办理退货吗？' })
    await refundSale(saleId)
    showToast('退货成功')
    loadOrder()
  } catch { /* */ }
}
</script>

<template>
  <div class="page">
    <van-nav-bar title="销售详情" left-text="返回" left-arrow @click-left="$router.back()" />
    <van-loading v-if="loading" class="loading" />
    <template v-if="!loading && order.id">
      <div class="card">
        <div class="info-row">
          <span>客户：{{ order.customer?.name || '散客' }}</span>
          <van-tag :type="order.status === 'refunded' ? 'warning' : 'success'">
            {{ order.status === 'refunded' ? '已退货' : '已完成' }}
          </van-tag>
        </div>
        <div class="info-row">
          <span>{{ payMethodLabel(order.pay_method) }}</span>
          <span class="text-secondary">{{ formatDateTime(order.created_at) }}</span>
        </div>
        <div class="amount">¥{{ formatMoney(order.total_amount) }}</div>
        <div v-if="order.pay_method === 'credit'" class="text-secondary">
          已付 ¥{{ formatMoney(order.paid_amount) }} · 赊账 ¥{{ formatMoney(order.credit_amount) }}
        </div>
      </div>
      <div class="card">
        <div class="card-title">商品明细</div>
        <div v-for="item in order.items" :key="item.id" class="item-row">
          <div class="item-name">{{ item.product?.name || '商品' }}</div>
          <div class="item-detail">
            <span class="text-secondary">{{ item.qty }} × ¥{{ formatMoney(item.unit_price) }}</span>
            <span>¥{{ formatMoney(item.subtotal) }}</span>
          </div>
        </div>
      </div>
      <div v-if="order.status === 'completed'" style="margin: 16px">
        <van-button round block type="danger" @click="handleRefund">申请退货</van-button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.page { background: #f7f8fa; min-height: 100vh; }
.loading { display: flex; justify-content: center; padding: 40px; }
.card { background: #fff; border-radius: 8px; margin: 12px; padding: 14px; }
.card-title { font-size: 15px; font-weight: 600; margin-bottom: 10px; }
.info-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 14px; }
.amount { font-size: 28px; font-weight: 700; margin: 8px 0; }
.item-row { padding: 10px 0; border-bottom: 1px solid #f5f5f5; }
.item-row:last-child { border-bottom: none; }
.item-name { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
.item-detail { display: flex; justify-content: space-between; font-size: 13px; }
.text-secondary { color: #969799; font-size: 12px; }
</style>
