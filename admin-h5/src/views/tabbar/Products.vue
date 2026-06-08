<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showToast } from 'vant'
import { getProducts, deleteProduct } from '../../api/admin'
import { formatMoney } from '../../utils/format'

const router = useRouter()
const products = ref<any[]>([])
const loading = ref(false)
const finished = ref(false)
const page = ref(1)
const keyword = ref('')

onMounted(() => loadProducts())

async function loadProducts(reset = false) {
  if (reset) { page.value = 1; products.value = [] }
  loading.value = true
  try {
    const res: any = await getProducts({ page: page.value, page_size: 20, keyword: keyword.value })
    const list = res.data?.list || []
    if (reset) products.value = list
    else products.value.push(...list)
    if (list.length < 20) finished.value = true
  } catch { /* */ }
  loading.value = false
}

function loadMore() { if (finished.value) return; page.value++; loadProducts() }

function onSearch() { finished.value = false; loadProducts(true) }

function goAdd() { router.push('/product-form') }
function goEdit(id: number) { router.push(`/product-form/${id}`) }
function goStockLog(id: number) { router.push(`/stock-log/${id}`) }

async function handleDelete(id: number, name: string) {
  try {
    await showConfirmDialog({ title: '删除商品', message: `确定删除「${name}」吗？` })
    await deleteProduct(id)
    showToast('已删除')
    loadProducts(true)
  } catch { /* cancelled */ }
}
</script>

<template>
  <div class="page">
    <van-nav-bar title="商品管理">
      <template #right><van-icon name="plus" size="20" @click="goAdd" /></template>
    </van-nav-bar>

    <van-search v-model="keyword" placeholder="搜索商品" @search="onSearch" />

    <van-list v-model:loading="loading" :finished="finished" finished-text="已加载全部" @load="loadMore">
      <div v-for="p in products" :key="p.id" class="item" @click="goEdit(p.id)">
        <div class="item-main">
          <div class="item-name">{{ p.name }}</div>
          <van-tag v-if="p.stock_qty <= (p.min_stock || 10)" type="danger" size="medium">低库存</van-tag>
        </div>
        <div class="item-info">
          <span>{{ p.barcode || '无条码' }} · 库存 {{ p.stock_qty || 0 }}{{ p.unit || '个' }}</span>
          <span class="price">¥{{ formatMoney(p.sale_price) }}</span>
        </div>
        <div class="item-actions">
          <van-button size="small" plain type="primary" @click.stop="goStockLog(p.id)">流水</van-button>
          <van-button size="small" plain type="danger" @click.stop="handleDelete(p.id, p.name)">删除</van-button>
        </div>
      </div>

      <van-empty v-if="!loading && !products.length" description="暂无商品" />
    </van-list>
  </div>
</template>

<style scoped>
.page { background: #f7f8fa; min-height: 100vh; padding-bottom: 50px; }
.item { background: #fff; border-radius: 8px; margin: 8px 12px; padding: 14px; }
.item-main { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.item-name { font-size: 15px; font-weight: 600; }
.item-info { display: flex; justify-content: space-between; font-size: 13px; color: #969799; margin-bottom: 10px; }
.price { color: #ee0a24; font-weight: 600; }
.item-actions { display: flex; gap: 8px; }
</style>
