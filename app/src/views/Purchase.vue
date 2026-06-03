<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showSuccessToast } from 'vant'
import { getProducts } from '../api/product'
import { getSuppliers } from '../api/supplier'
import { createPurchase } from '../api/purchase'
import { useCartStore } from '../stores/cart'
import { formatMoney } from '../utils/format'

const router = useRouter()
const cart = useCartStore()

const showProductPicker = ref(false)
const showSupplierPicker = ref(false)
const productSearch = ref('')
const productResults = ref<any[]>([])
const allProducts = ref<any[]>([])
const suppliers = ref<any[]>([])
const selectedSupplier = ref<any>(null)
const remark = ref('')
const submitting = ref(false)

onMounted(() => {
  cart.clearCart()
})

async function loadProducts(supplierId?: number) {
  try {
    const params: any = { page_size: 200 }
    if (supplierId) params.supplier_id = supplierId
    const res: any = await getProducts(params)
    allProducts.value = res.data?.list || []
  } catch { /* */ }
}

function openProductPicker() {
  productResults.value = productSearch.value
    ? allProducts.value.filter(p => p.name.includes(productSearch.value))
    : allProducts.value
  showProductPicker.value = true
}

function searchProducts() {
  if (!productSearch.value) {
    productResults.value = allProducts.value
  } else {
    productResults.value = allProducts.value.filter(
      p => p.name.includes(productSearch.value) || (p.barcode && p.barcode.includes(productSearch.value))
    )
  }
}

function selectProduct(p: any) {
  cart.addItem({ id: p.id, name: p.name, sale_price: p.sale_price, purchase_price: p.purchase_price, spec: p.spec, unit: p.unit, stock_qty: p.stock_qty })
  productSearch.value = ''
  showProductPicker.value = false
}

function updateItemQty(idx: number, val: string | number) {
  const n = typeof val === 'string' ? parseInt(val) : val
  if (isNaN(n) || n < 1) {
    cart.items[idx].qty = cart.items[idx].qty
    return
  }
  cart.items[idx].qty = Math.min(n, 9999)
}

async function loadSuppliers() {
  try {
    const res: any = await getSuppliers()
    suppliers.value = res.data || []
  } catch { /* */ }
  showSupplierPicker.value = true
}

function selectSupplier(s: any) {
  selectedSupplier.value = s
  showSupplierPicker.value = false
  cart.clearCart()
  productSearch.value = ''
  loadProducts(s.id)
}

function clearSupplier() {
  selectedSupplier.value = null
  cart.clearCart()
  allProducts.value = []
}

async function submitPurchase() {
  if (!selectedSupplier.value) { showToast('请选择进货商'); return }
  if (!cart.items.length) { showToast('请添加商品'); return }
  submitting.value = true
  try {
    await createPurchase({
      supplier_id: selectedSupplier.value.id,
      items: cart.items.map(i => ({ product_id: i.product.id, qty: i.qty, unit_price: i.product.purchase_price || i.product.sale_price })),
      remark: remark.value
    })
    showSuccessToast('入库成功')
    cart.clearCart()
    remark.value = ''
  } catch (err: any) {
    showToast(err.response?.data?.message || '入库失败')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="page">
    <!-- Supplier -->
    <div class="supplier-card" :class="{ 'supplier-selected': selectedSupplier }">
      <div class="supplier-top">
        <div class="supplier-icon">🏭</div>
        <div class="supplier-info">
          <div v-if="selectedSupplier" class="supplier-name">{{ selectedSupplier.name }}</div>
          <div v-else class="supplier-placeholder">选择进货商开始入库</div>
          <div v-if="selectedSupplier?.phone" class="supplier-phone">{{ selectedSupplier.phone }}</div>
          <div v-if="selectedSupplier" class="supplier-hint-meta">仅显示该进货商商品</div>
        </div>
        <div class="supplier-actions">
          <van-button
            v-if="selectedSupplier"
            size="small" plain type="warning"
            icon="cross" @click="clearSupplier"
          >切换</van-button>
          <van-button
            size="small" :type="selectedSupplier ? 'primary' : 'primary'"
            plain :icon="selectedSupplier ? 'swap' : 'add-o'"
            @click="loadSuppliers"
          >{{ selectedSupplier ? '换商' : '选择' }}</van-button>
        </div>
      </div>
      <van-field v-if="selectedSupplier" v-model="remark" label="备注" placeholder="选填" label-width="3em" />
    </div>

    <!-- Products -->
    <div class="product-card" v-if="selectedSupplier">
      <div class="product-header">
        <span class="product-title">📦 入库商品</span>
        <span class="product-count">{{ cart.items.length }} 种 | {{ allProducts.length }} 可选</span>
      </div>

      <van-cell-group inset style="margin-bottom:8px">
        <van-field v-model="productSearch" placeholder="🔍 搜索商品添加" @click="openProductPicker" readonly right-icon="search" />
      </van-cell-group>

      <!-- Cart Items -->
      <div v-if="cart.items.length" class="cart-list">
        <div v-for="(item, idx) in cart.items" :key="idx" class="cart-item">
          <div class="cart-left">
            <div class="cart-name">{{ item.product.name }}</div>
            <div class="cart-meta">
              <span class="meta-spec">{{ item.product.spec || '默认规格' }}</span>
              <span class="meta-dot">·</span>
              <span class="meta-price">进价 ¥{{ formatMoney(item.product.purchase_price || item.product.sale_price) }}</span>
              <span class="meta-dot">·</span>
              <span>{{ item.product.unit || '个' }}</span>
            </div>
          </div>
          <div class="cart-qty">
            <van-button size="mini" icon="minus" @click="cart.updateQty(idx, -1)" />
            <input
              class="qty-input"
              type="number"
              min="1" max="9999"
              :value="item.qty"
              @input="updateItemQty(idx, ($event.target as HTMLInputElement).value)"
              @blur="updateItemQty(idx, item.qty)"
            />
            <van-button size="mini" icon="plus" @click="cart.updateQty(idx, 1)" />
          </div>
          <van-icon name="cross" size="16" color="#c8c9cc" @click="cart.removeItem(idx)" class="cart-remove" />
        </div>
      </div>
      <div v-else class="empty-hint">
        <van-icon name="add-o" size="24" color="#c8c9cc" />
        <span>点击上方搜索框添加商品</span>
      </div>
    </div>

    <!-- No supplier selected -->
    <div v-if="!selectedSupplier" class="no-supplier">
      <van-icon name="shop-o" size="48" color="#c8c9cc" />
      <p>请先选择进货商</p>
      <p class="no-supplier-hint">选择进货商后将显示该供应商的商品列表</p>
    </div>

    <!-- Bottom bar -->
    <div class="bottom-bar" v-if="selectedSupplier">
      <div class="total-row">
        <div class="total-label">
          <span class="total-text">入库合计</span>
          <span class="total-qty">{{ cart.totalQty }} 件</span>
        </div>
        <span class="total-amount">¥{{ formatMoney(cart.totalPurchaseAmount) }}</span>
      </div>
      <van-button type="primary" size="large" round :loading="submitting" @click="submitPurchase" :disabled="!cart.items.length">
        确认入库
      </van-button>
    </div>

    <!-- Product Picker -->
    <van-popup v-model:show="showProductPicker" position="bottom" :style="{ height: '65%' }" round>
      <div class="picker-head">
        <van-search v-model="productSearch" placeholder="搜索商品" @search="searchProducts" @update:model-value="searchProducts" />
      </div>
      <div class="picker-body">
        <div v-for="p in (productSearch ? productResults : allProducts)" :key="p.id" class="picker-item" @click="selectProduct(p)">
          <div class="picker-info">
            <div class="picker-name">{{ p.name }}</div>
            <div class="text-secondary">{{ p.spec || '' }} · 库存 {{ p.stock_qty || 0 }}{{ p.unit || '个' }}</div>
          </div>
          <div class="picker-price">
            <span class="price-label">进价</span>
            <span class="price-value">¥{{ formatMoney(p.purchase_price || 0) }}</span>
          </div>
        </div>
        <van-empty v-if="!allProducts.length && !productSearch" description="该进货商暂无商品" />
        <van-empty v-if="productSearch && !productResults.length" description="无匹配商品" />
      </div>
    </van-popup>

    <!-- Supplier Picker -->
    <van-popup v-model:show="showSupplierPicker" position="bottom" :style="{ height: '55%' }" round>
      <div class="picker-head">
        <h4>选择进货商</h4>
      </div>
      <div class="picker-body">
        <div v-for="s in suppliers" :key="s.id" class="picker-item picker-supplier" @click="selectSupplier(s)" :class="{ 'picker-supplier-active': selectedSupplier?.id === s.id }">
          <div class="picker-supplier-left">
            <div class="picker-supplier-avatar">🏭</div>
            <div>
              <div class="picker-supplier-name">{{ s.name }}</div>
              <div class="text-secondary">{{ s.phone || '无联系方式' }}</div>
            </div>
          </div>
          <van-icon v-if="selectedSupplier?.id === s.id" name="success" size="20" color="#2563eb" />
        </div>
        <van-empty v-if="!suppliers.length" description="暂无进货商，请先到「我的 → 进货商管理」添加" />
      </div>
    </van-popup>
  </div>
</template>

<style scoped>
.page { background: #f7f8fa; min-height: 100vh; padding: 12px; padding-bottom: 120px; }

/* ===== Supplier Card ===== */
.supplier-card {
  background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.supplier-card.supplier-selected {
  border-left: 4px solid #2563eb;
}
.supplier-top { display: flex; align-items: center; gap: 12px; }
.supplier-icon {
  width: 44px; height: 44px; border-radius: 12px;
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
  display: flex; align-items: center; justify-content: center; font-size: 22px;
}
.supplier-info { flex: 1; }
.supplier-name { font-size: 17px; font-weight: 700; color: #1a1a1a; }
.supplier-placeholder { font-size: 15px; color: #969799; }
.supplier-phone { font-size: 12px; color: #646566; margin-top: 2px; }
.supplier-hint-meta { font-size: 11px; color: #2563eb; margin-top: 2px; }
.supplier-actions { display: flex; flex-direction: column; gap: 6px; }

/* ===== No Supplier ===== */
.no-supplier {
  text-align: center; padding: 80px 20px; color: #969799;
}
.no-supplier p { margin: 8px 0; font-size: 15px; }
.no-supplier-hint { font-size: 12px; color: #c8c9cc; }

/* ===== Product Card ===== */
.product-card {
  background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.product-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;
}
.product-title { font-size: 15px; font-weight: 600; color: #323233; }
.product-count { font-size: 12px; color: #969799; background: #f2f3f5; padding: 2px 10px; border-radius: 10px; }

/* ===== Cart Items ===== */
.cart-list { margin-top: 8px; }
.cart-item {
  display: flex; align-items: center; background: #fff;
  border: 1px solid #ebedf0; border-radius: 10px; padding: 12px; margin-bottom: 8px;
  transition: box-shadow 0.15s;
}
.cart-item:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.cart-left { flex: 1; min-width: 0; }
.cart-name { font-size: 14px; font-weight: 600; color: #1a1a1a; }
.cart-meta { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #969799; margin-top: 4px; flex-wrap: wrap; }
.meta-spec { color: #646566; }
.meta-dot { color: #c8c9cc; }
.meta-price { color: #2563eb; font-weight: 500; }
.cart-qty { display: flex; align-items: center; gap: 4px; margin: 0 10px; }
.qty-input {
  width: 44px; height: 28px; text-align: center; font-size: 14px; font-weight: 700;
  border: 1px solid #ebedf0; border-radius: 6px; outline: none; -moz-appearance: textfield;
}
.qty-input::-webkit-outer-spin-button, .qty-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.cart-remove { cursor: pointer; flex-shrink: 0; }

/* ===== Empty ===== */
.empty-hint {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  color: #c8c9cc; padding: 40px 0; font-size: 13px;
}

/* ===== Bottom Bar ===== */
.bottom-bar {
  position: fixed; bottom: 50px; left: 0; right: 0;
  background: #fff; border-radius: 16px 16px 0 0;
  padding: 16px 16px calc(16px + env(safe-area-inset-bottom));
  box-shadow: 0 -4px 20px rgba(0,0,0,0.08); z-index: 1;
}
.total-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.total-label { display: flex; align-items: baseline; gap: 8px; }
.total-text { font-size: 14px; color: #646566; }
.total-qty { font-size: 12px; color: #2563eb; background: #eff6ff; padding: 2px 8px; border-radius: 8px; }
.total-amount { font-weight: 700; color: #ee0a24; font-size: 26px; }

/* ===== Pickers ===== */
.picker-head { padding: 16px 12px; border-bottom: 1px solid #f0f0f0; }
.picker-head h4 { margin: 0; font-size: 17px; font-weight: 600; }
.picker-body { padding: 0 12px; overflow-y: auto; max-height: calc(100% - 60px); }
.picker-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 0; border-bottom: 1px solid #f5f5f5; cursor: pointer;
}
.picker-info { flex: 1; min-width: 0; }
.picker-name { font-size: 15px; font-weight: 500; }
.picker-price { text-align: right; }
.price-label { font-size: 11px; color: #969799; display: block; }
.price-value { font-weight: 700; font-size: 16px; color: #2563eb; }

/* ===== Supplier Picker ===== */
.picker-supplier { gap: 12px; }
.picker-supplier-left { display: flex; align-items: center; gap: 10px; flex: 1; }
.picker-supplier-avatar {
  width: 40px; height: 40px; border-radius: 10px;
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
  display: flex; align-items: center; justify-content: center; font-size: 18px;
}
.picker-supplier-name { font-size: 15px; font-weight: 600; }
.picker-supplier-active { background: #f8faff; border-radius: 8px; padding-left: 8px; padding-right: 8px; }

.text-secondary { color: #969799; font-size: 12px; }
</style>
