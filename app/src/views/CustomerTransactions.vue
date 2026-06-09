<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { showImagePreview, showToast, showSuccessToast } from 'vant'
import { getCustomerTransactions, updateSaleInvoice } from '../api/sale'
import { uploadInvoice } from '../api/upload'
import { formatMoney, formatDateTime, payMethodLabel } from '../utils/format'

const route = useRoute()
const customerId = Number(route.params.id)

const orders = ref<any[]>([])
const customer = ref<any>(null)
const loading = ref(false)
const loadingMore = ref(false)
const page = ref(1)
const total = ref(0)
const pageSize = 20

// Filter state
const filterStartDate = ref('')
const filterEndDate = ref('')
const filterSearch = ref('')
let searchTimer: any = null

const uploadingOrderId = ref<number | null>(null)
const uploadInputRefs = ref<Record<number, HTMLInputElement | null>>({})

onMounted(() => loadTransactions())

watch([filterStartDate, filterEndDate], () => {
  loadTransactions()
})

function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => loadTransactions(), 400)
}

function clearFilters() {
  filterStartDate.value = ''
  filterEndDate.value = ''
  filterSearch.value = ''
  loadTransactions()
}

async function loadTransactions() {
  loading.value = true
  page.value = 1
  try {
    const params: any = { page: 1, page_size: pageSize }
    if (filterStartDate.value) params.start_date = filterStartDate.value
    if (filterEndDate.value) params.end_date = filterEndDate.value
    if (filterSearch.value) params.search = filterSearch.value
    const res: any = await getCustomerTransactions(customerId, params)
    orders.value = res.data?.list || []
    total.value = res.data?.total || 0
    customer.value = res.data?.customer || null
  } catch { /* */ }
  finally { loading.value = false }
}

async function loadMore() {
  if (loadingMore.value || orders.value.length >= total.value) return
  loadingMore.value = true
  page.value++
  try {
    const params: any = { page: page.value, page_size: pageSize }
    if (filterStartDate.value) params.start_date = filterStartDate.value
    if (filterEndDate.value) params.end_date = filterEndDate.value
    if (filterSearch.value) params.search = filterSearch.value
    const res: any = await getCustomerTransactions(customerId, params)
    const list = res.data?.list || []
    orders.value.push(...list)
  } catch { /* */ }
  finally { loadingMore.value = false }
}

function previewInvoice(url: string) {
  if (!url) return
  showImagePreview({
    images: [url],
    closeable: true,
    showIndex: false,
  })
}

async function onSupplementUpload(orderId: number, e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  uploadingOrderId.value = orderId
  try {
    const res: any = await uploadInvoice(file, 'sale')
    const url = res.data?.url || ''
    if (url) {
      await updateSaleInvoice(orderId, url)
      const order = orders.value.find(o => o.id === orderId)
      if (order) order.invoice_url = url
      showSuccessToast('发票已上传')
    }
  } catch {
    showToast('上传失败，请重试')
  } finally {
    uploadingOrderId.value = null
  }
}

function triggerUpload(orderId: number) {
  uploadInputRefs.value[orderId]?.click()
}
</script>

<template>
  <div class="page">
    <van-nav-bar title="销售记录" left-text="返回" left-arrow @click-left="$router.back()" />

    <!-- Customer Header -->
    <div class="hero-banner" v-if="customer">
      <div class="hero-glow"></div>
      <div class="hero-content">
        <div class="hero-avatar">👤</div>
        <div class="hero-info">
          <div class="hero-name">{{ customer.name }}</div>
          <div class="hero-meta">{{ customer.phone || '无联系方式' }}</div>
        </div>
        <div class="hero-stat">
          <div class="hero-num">{{ total }}</div>
          <div class="hero-label">笔销售</div>
        </div>
      </div>
    </div>

    <!-- Filter Bar -->
    <div class="filter-bar">
      <div class="filter-row">
        <div class="filter-date-group">
          <input type="date" v-model="filterStartDate" class="date-input" />
          <span class="date-sep">至</span>
          <input type="date" v-model="filterEndDate" class="date-input" />
        </div>
        <van-button v-if="filterStartDate || filterEndDate || filterSearch" size="small" plain type="primary" @click="clearFilters">清除</van-button>
      </div>
      <div class="search-row">
        <van-icon name="search" size="16" color="#94a3b8" />
        <input
          v-model="filterSearch"
          type="text"
          placeholder="搜索商品名称..."
          class="search-input"
          @input="onSearchInput"
        />
        <van-icon v-if="filterSearch" name="clear" size="16" color="#c8c9cc" @click="filterSearch=''; loadTransactions()" />
      </div>
    </div>

    <van-empty v-if="!loading && !orders.length" description="暂无销售记录">
      <span style="color:#969799;font-size:13px">该客户还没有任何销售记录</span>
    </van-empty>

    <!-- Transaction List -->
    <div v-for="(order, idx) in orders" :key="order.id" class="order-card" :class="{ 'is-refunded': order.status === 'refunded' }" :style="{ animationDelay: `${idx * 0.05}s` }">
      <!-- Date & Total Header -->
      <div class="order-header">
        <div class="order-date">
          <span class="date-icon">📅</span>
          <span>{{ formatDateTime(order.created_at) }}</span>
          <span class="pay-badge">{{ payMethodLabel(order.pay_method) }}</span>
          <span v-if="order.status === 'refunded'" class="refund-badge">已退货</span>
        </div>
        <div class="order-total">
          <span class="total-label">合计</span>
          <span class="total-num">¥{{ formatMoney(order.total_amount) }}</span>
        </div>
      </div>

      <!-- Items Table -->
      <div class="items-table">
        <div class="table-head">
          <span class="col-name">商品</span>
          <span class="col-spec">规格</span>
          <span class="col-price">单价</span>
          <span class="col-qty">数量</span>
          <span class="col-sub">小计</span>
        </div>
        <div v-for="item in order.items" :key="item.id" class="table-row">
          <span class="col-name">{{ item.product?.name || '—' }}</span>
          <span class="col-spec">{{ item.product?.spec || '—' }}</span>
          <span class="col-price">¥{{ formatMoney(item.unit_price) }}/{{ item.product?.unit || '个' }}</span>
          <span class="col-qty">×{{ item.qty }}</span>
          <span class="col-sub">¥{{ formatMoney(item.subtotal) }}</span>
        </div>
      </div>

      <!-- Invoice Section -->
      <div class="invoice-section">
        <div v-if="order.invoice_url" class="invoice-has" @click="previewInvoice(order.invoice_url)">
          <div class="invoice-thumb">
            <img :src="order.invoice_url" alt="发票" loading="lazy" />
          </div>
          <div class="invoice-meta">
            <span class="invoice-tag">🧾 发票凭证</span>
            <span class="invoice-hint">点击查看大图 · 长按保存</span>
          </div>
          <van-icon name="arrow" size="16" color="#b45309" />
        </div>

        <div v-else class="invoice-none">
          <div class="invoice-none-icon">📋</div>
          <div class="invoice-none-text">
            <span class="none-title">此笔订单未上传发票</span>
            <span class="none-hint">可补充上传发票凭证</span>
          </div>
          <van-button
            size="small" plain type="warning" icon="photograph"
            :loading="uploadingOrderId === order.id"
            @click="triggerUpload(order.id)"
          >上传</van-button>
          <input
            :ref="el => uploadInputRefs[order.id] = el as HTMLInputElement"
            type="file" accept="image/*" style="display:none"
            @change="onSupplementUpload(order.id, $event)"
          />
        </div>
      </div>

      <!-- Remark -->
      <div v-if="order.remark" class="order-remark">📝 {{ order.remark }}</div>
    </div>

    <!-- Load More -->
    <div v-if="orders.length < total" class="load-more">
      <van-button size="small" plain :loading="loadingMore" @click="loadMore">加载更多</van-button>
    </div>

    <div style="height:40px"></div>
  </div>
</template>

<style scoped>
.page { background: #f5f5f7; min-height: 100vh; padding-bottom: 20px; }

/* Hero Banner */
.hero-banner {
  position: relative; margin: 12px 16px; padding: 22px 20px; border-radius: 18px;
  background: linear-gradient(145deg, #064e3b, #059669, #10b981);
  overflow: hidden;
}
.hero-glow {
  position: absolute; top: -40px; right: -30px;
  width: 120px; height: 120px; border-radius: 50%;
  background: rgba(255,255,255,0.08);
}
.hero-content {
  position: relative; display: flex; align-items: center; gap: 14px;
}
.hero-avatar {
  width: 50px; height: 50px; min-width: 50px; border-radius: 14px;
  background: rgba(255,255,255,0.15); backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center; font-size: 24px;
}
.hero-info { flex: 1; min-width: 0; color: #fff; }
.hero-name { font-size: 18px; font-weight: 700; letter-spacing: 0.02em; }
.hero-meta { font-size: 13px; opacity: 0.75; margin-top: 2px; }
.hero-stat { text-align: center; color: #fff; }
.hero-num { font-size: 28px; font-weight: 800; }
.hero-label { font-size: 11px; opacity: 0.65; }

/* Order Card */
.order-card {
  background: #fff; border-radius: 16px; margin: 0 16px 16px;
  padding: 0; overflow: hidden;
  box-shadow: 0 2px 16px rgba(0,0,0,0.05);
  animation: fadeUp 0.45s ease both;
}
.order-card.is-refunded { opacity: 0.65; }
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

.order-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 18px;
  background: linear-gradient(135deg, #f0fdf4, #ecfdf5);
  border-bottom: 1px solid #d1fae5;
}
.order-date {
  font-size: 13px; color: #64748b;
  display: flex; align-items: center; gap: 4px; flex-wrap: wrap;
}
.date-icon { font-size: 14px; }
.pay-badge {
  font-size: 11px; padding: 2px 8px; border-radius: 10px; font-weight: 600;
  background: #dbeafe; color: #1e40af;
}
.refund-badge {
  font-size: 11px; padding: 2px 8px; border-radius: 10px; font-weight: 600;
  background: #fee2e2; color: #dc2626;
}
.order-total { text-align: right; }
.total-label { font-size: 11px; color: #94a3b8; display: block; }
.total-num { font-size: 20px; font-weight: 800; color: #059669; }

/* Items Table */
.items-table { padding: 8px 16px 12px; }
.table-head {
  display: flex; gap: 6px; padding: 8px 4px;
  font-size: 11px; color: #94a3b8; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.04em;
  border-bottom: 1px solid #f1f5f9;
}
.table-row {
  display: flex; gap: 6px; align-items: center;
  padding: 8px 4px; font-size: 13px;
  border-bottom: 1px solid #f8fafc;
}
.table-row:last-child { border-bottom: none; }
.col-name { flex: 3; font-weight: 600; color: #1e293b; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.col-spec { flex: 1.5; color: #94a3b8; font-size: 11px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.col-price { flex: 2.5; color: #64748b; font-size: 12px; text-align: center; }
.col-qty { flex: 1; color: #64748b; text-align: center; font-weight: 600; }
.col-sub { flex: 1.8; color: #dc2626; font-weight: 700; text-align: right; font-size: 13px; }

/* Invoice Section */
.invoice-section { border-top: 1px solid #f1f5f9; }
.invoice-has {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 18px; cursor: pointer;
  transition: background 0.15s;
}
.invoice-has:active { background: #fefce8; }
.invoice-thumb {
  width: 52px; height: 52px; border-radius: 10px; overflow: hidden;
  box-shadow: 0 2px 10px rgba(0,0,0,0.08); flex-shrink: 0;
}
.invoice-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.invoice-meta { flex: 1; min-width: 0; }
.invoice-tag { display: block; font-size: 13px; font-weight: 600; color: #92400e; }
.invoice-hint { display: block; font-size: 11px; color: #d4a574; margin-top: 2px; }

.invoice-none {
  display: flex; align-items: center; gap: 12px; padding: 14px 18px;
  background: linear-gradient(135deg, #fefce8, #fffbeb);
}
.invoice-none-icon { font-size: 24px; opacity: 0.5; }
.invoice-none-text { flex: 1; min-width: 0; }
.none-title { display: block; font-size: 13px; font-weight: 500; color: #a16207; }
.none-hint { display: block; font-size: 11px; color: #d4a574; margin-top: 2px; }

.order-remark { font-size: 12px; color: #94a3b8; padding: 0 18px 14px; }

.load-more { text-align: center; padding: 8px 0 32px; }

/* Filter Bar */
.filter-bar {
  margin: 0 16px 12px;
  background: #fff; border-radius: 14px; padding: 14px 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}
.filter-row {
  display: flex; align-items: center; gap: 8px; margin-bottom: 10px;
}
.filter-date-group {
  display: flex; align-items: center; gap: 6px; flex: 1;
}
.date-input {
  flex: 1; padding: 8px 10px; font-size: 13px;
  border: 1px solid #e2e8f0; border-radius: 8px;
  color: #334155; background: #f8fafc;
  outline: none; -webkit-appearance: none;
}
.date-input:focus { border-color: #059669; }
.date-sep { font-size: 12px; color: #94a3b8; flex-shrink: 0; }
.search-row {
  display: flex; align-items: center; gap: 8px;
  background: #f1f5f9; border-radius: 8px; padding: 0 12px;
}
.search-input {
  flex: 1; padding: 9px 0; font-size: 13px;
  border: none; outline: none; background: transparent;
  color: #1e293b;
}
.search-input::placeholder { color: #94a3b8; }
</style>
