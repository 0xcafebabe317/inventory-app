<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getProducts } from '../../api/product'
import { formatMoney } from '../../utils/format'

const router = useRouter()
const products = ref<any[]>([])
const search = ref('')
const page = ref(1)
const total = ref(0)
const loading = ref(false)
const finished = ref(false)

onMounted(() => loadProducts())

async function loadProducts(reset = false) {
  if (reset) { page.value = 1; finished.value = false }
  loading.value = true
  try {
    const res: any = await getProducts({ page: page.value, page_size: 20, search: search.value })
    const list = res.data?.list || []
    if (reset) products.value = list
    else products.value.push(...list)
    total.value = res.data?.total || 0
    if (list.length < 20) finished.value = true
  } catch { /* */ }
  loading.value = false
}

function onSearch() { page.value = 1; loadProducts(true) }

function loadMore() {
  if (finished.value) return
  page.value++
  loadProducts()
}
</script>

<template>
  <div class="page">

    <van-search v-model="search" placeholder="搜索商品名称" @search="onSearch" @clear="onSearch" />

    <div class="toolbar">
      <span class="text-secondary">共 {{ total }} 件</span>
      <van-button size="small" type="primary" @click="router.push({ name: 'ProductForm' })">新增商品</van-button>
    </div>

    <van-list v-model:loading="loading" :finished="finished" finished-text="已加载全部" @load="loadMore">
      <div v-for="p in products" :key="p.id" class="product-card" @click="router.push({ name: 'ProductForm', params: { id: p.id } })">
        <div class="prod-row">
          <div class="prod-name">
            {{ p.name }}
            <van-tag v-if="p.stock_qty <= p.min_stock" type="danger" size="mini">低库存</van-tag>
          </div>
          <span class="prod-price">¥{{ formatMoney(p.sale_price) }}</span>
        </div>
        <div class="prod-row">
          <span class="text-secondary">库存: {{ p.stock_qty || 0 }}{{ p.unit || '个' }} · {{ p.supplier?.name || '未指定供货商' }}</span>
          <van-button size="mini" plain @click.stop="router.push({ name: 'StockLog', params: { id: p.id } })">流水</van-button>
        </div>
      </div>

      <van-empty v-if="!loading && !products.length" description="暂无商品">
        <van-button type="primary" size="small" @click="router.push({ name: 'ProductForm' })">添加第一个商品</van-button>
      </van-empty>
    </van-list>
  </div>
</template>

<style scoped>
.page { padding: 12px; padding-bottom: 60px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; padding: 8px 4px; }
.product-card {
  background: #fff; border-radius: 10px; padding: 14px 16px; margin-bottom: 8px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04); cursor: pointer;
}
.prod-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.prod-name { font-size: 15px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
.prod-price { font-weight: 700; font-size: 17px; color: #323233; }
.text-secondary { color: #969799; font-size: 12px; }
</style>
