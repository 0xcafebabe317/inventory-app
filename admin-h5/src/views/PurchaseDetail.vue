<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { showToast } from 'vant'
import { getPurchase } from '../api/admin'
import { formatMoney, formatDateTime } from '../utils/format'

const route = useRoute()
const order = ref<any>({})
const loading = ref(true)

onMounted(async () => {
  try { const res: any = await getPurchase(Number(route.params.id)); order.value = res.data } catch { showToast('加载失败') }
  loading.value = false
})
</script>

<template>
  <div class="page">
    <van-nav-bar title="进货详情" left-text="返回" left-arrow @click-left="$router.back()" />
    <van-loading v-if="loading" class="loading" />
    <template v-if="!loading && order.id">
      <div class="card">
        <div class="info-row"><span>供应商：{{ order.supplier?.name || '无' }}</span><span class="text-secondary">{{ formatDateTime(order.created_at) }}</span></div>
        <div class="amount">¥{{ formatMoney(order.total_amount) }}</div>
        <div v-if="order.remark" class="text-secondary">备注：{{ order.remark }}</div>
      </div>
      <div class="card">
        <div class="card-title">进货明细</div>
        <div v-for="item in order.items" :key="item.id" class="item-row">
          <div class="item-name">{{ item.product?.name || '商品' }}</div>
          <div class="item-detail">
            <span class="text-secondary">{{ item.qty }} × ¥{{ formatMoney(item.unit_price) }}</span>
            <span>¥{{ formatMoney(item.subtotal) }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.page { background: #f7f8fa; min-height: 100vh; }
.loading { display: flex; justify-content: center; padding: 40px; }
.card { background: #fff; border-radius: 8px; margin: 12px; padding: 14px; }
.card-title { font-size: 15px; font-weight: 600; margin-bottom: 10px; }
.info-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
.amount { font-size: 28px; font-weight: 700; margin: 8px 0; }
.item-row { padding: 10px 0; border-bottom: 1px solid #f5f5f5; }
.item-row:last-child { border-bottom: none; }
.item-name { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
.item-detail { display: flex; justify-content: space-between; font-size: 13px; }
.text-secondary { color: #969799; font-size: 12px; }
</style>
