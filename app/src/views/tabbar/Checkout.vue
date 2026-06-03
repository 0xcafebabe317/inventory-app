<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showSuccessToast } from 'vant'
import { getProducts } from '../../api/product'
import { getCustomers } from '../../api/customer'
import { createSale } from '../../api/sale'
import { useCartStore } from '../../stores/cart'
import { formatMoney } from '../../utils/format'

const router = useRouter()
const cart = useCartStore()

const showProductPicker = ref(false)
const showCustomerPicker = ref(false)
const productSearch = ref('')
const productResults = ref<any[]>([])
const allProducts = ref<any[]>([])
const customerResults = ref<any[]>([])
const payMethod = ref('wechat')
const selectedCustomer = ref<any>(null)
const paidAmount = ref('')
const submitting = ref(false)

const payMethods = [
  { label: '微信', value: 'wechat', icon: '💚' },
  { label: '支付宝', value: 'alipay', icon: '💙' },
  { label: '现金', value: 'cash', icon: '💵' }
]

async function openProductPicker() {
  if (!allProducts.value.length) {
    try {
      const res: any = await getProducts({ page_size: 200 })
      allProducts.value = res.data?.list || []
    } catch { /* handled */ }
  }
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
  cart.addItem({ id: p.id, name: p.name, sale_price: p.sale_price, spec: p.spec, unit: p.unit, stock_qty: p.stock_qty })
  productSearch.value = ''
  productResults.value = []
  showProductPicker.value = false
}

function updateItemQty(idx: number, val: string | number) {
  const n = typeof val === 'string' ? parseInt(val) : val
  if (isNaN(n) || n < 1) {
    // Reset to current value
    cart.items[idx].qty = cart.items[idx].qty
    return
  }
  cart.items[idx].qty = Math.min(n, 9999)
}

async function loadCustomers() {
  try {
    const res: any = await getCustomers()
    customerResults.value = res.data || []
  } catch { /* handled */ }
  showCustomerPicker.value = true
}

function selectCustomer(c: any) {
  selectedCustomer.value = c
  showCustomerPicker.value = false
}

function clearCustomer() {
  selectedCustomer.value = null
}

async function submitSale() {
  if (!cart.items.length) { showToast('请添加商品'); return }
  submitting.value = true
  try {
    await createSale({
      items: cart.items.map(i => ({ product_id: i.product.id, qty: i.qty, unit_price: i.product.sale_price })),
      pay_method: payMethod.value,
      customer_id: selectedCustomer.value?.id || null,
      paid_amount: cart.totalAmount
    })
    showSuccessToast('收款成功')
    cart.clearCart()
    payMethod.value = 'wechat'
    selectedCustomer.value = null
  } catch (err: any) {
    const msg = err.response?.data?.message || '开单失败'
    showToast(msg)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="page">
    <!-- Customer selector: 散客(default) / 批发 equal buttons -->
    <div class="customer-bar">
      <span class="customer-bar-title">客户</span>
      <div class="customer-actions">
        <van-button
          :type="!selectedCustomer ? 'primary' : 'default'"
          size="small" @click="clearCustomer"
        >🧑 散客</van-button>
        <van-button
          :type="selectedCustomer ? 'primary' : 'default'"
          size="small" @click="loadCustomers"
        >🏪 {{ selectedCustomer ? selectedCustomer.name : '批发' }}</van-button>
      </div>
    </div>

    <!-- Product Search -->
    <van-cell-group inset style="margin-bottom:8px">
      <van-field v-model="productSearch" placeholder="搜索商品名称" @click="openProductPicker" readonly right-icon="search" />
    </van-cell-group>

    <!-- Cart Items -->
    <div v-if="cart.items.length" class="cart-list">
      <div v-for="(item, idx) in cart.items" :key="idx" class="cart-item">
        <div class="cart-info">
          <div class="cart-name">{{ item.product.name }}</div>
          <div class="cart-meta">{{ item.product.spec || '' }} · ¥{{ formatMoney(item.product.sale_price) }}/{{ item.product.unit || '个' }}</div>
        </div>
        <div class="cart-qty">
          <van-button size="mini" icon="minus" @click="cart.updateQty(idx, -1)" />
          <input
            class="qty-input"
            type="number"
            min="1"
            max="9999"
            :value="item.qty"
            @input="updateItemQty(idx, ($event.target as HTMLInputElement).value)"
            @blur="updateItemQty(idx, item.qty)"
          />
          <van-button size="mini" icon="plus" @click="cart.updateQty(idx, 1)" />
        </div>
        <div class="cart-sub">¥{{ formatMoney(item.product.sale_price * item.qty) }}</div>
        <van-icon name="cross" size="16" color="#c8c9cc" @click="cart.removeItem(idx)" style="margin-left:6px;cursor:pointer" />
      </div>
    </div>
    <div v-else class="empty-hint">点击上方搜索框添加商品</div>

    <!-- Payment Method -->
    <div class="card">
      <div class="card-title">收款方式</div>
      <div class="pay-row">
        <van-button
          v-for="p in payMethods" :key="p.value"
          :type="payMethod === p.value ? 'primary' : 'default'"
          size="small" round
          @click="payMethod = p.value"
        >
          {{ p.icon }} {{ p.label }}
        </van-button>
      </div>
    </div>

    <!-- Bottom bar -->
    <div class="bottom-bar">
      <div class="total-row">
        <span>共 {{ cart.totalQty }} 件 · 合计</span>
        <span class="total-amount">¥{{ formatMoney(cart.totalAmount) }}</span>
      </div>
      <van-button type="primary" size="large" round :loading="submitting" @click="submitSale" :disabled="!cart.items.length">
        确认收款
      </van-button>
    </div>

    <!-- Product Picker Modal -->
    <van-popup v-model:show="showProductPicker" position="bottom" :style="{ height: '65%' }" round>
      <div class="picker-head">
        <van-search v-model="productSearch" placeholder="搜索商品" @search="searchProducts" @update:model-value="searchProducts" />
      </div>
      <div class="picker-body">
        <div v-for="p in (productSearch ? productResults : allProducts)" :key="p.id" class="picker-item" @click="selectProduct(p)">
          <div class="picker-info">
            <div class="picker-name">{{ p.name }}</div>
            <div class="text-secondary">{{ p.spec || '' }} · 库存{{ p.stock_qty || 0 }}{{ p.unit || '个' }} · {{ p.supplier?.name || '未知供货商' }}</div>
          </div>
          <span class="text-large">¥{{ formatMoney(p.sale_price) }}</span>
        </div>
        <van-empty v-if="!allProducts.length && !productSearch" description="暂无商品">
          <van-button type="primary" size="small" @click="router.push({ name: 'ProductForm' })">添加第一个商品</van-button>
        </van-empty>
        <van-empty v-if="productSearch && !productResults.length" description="无匹配商品" />
      </div>
    </van-popup>

    <!-- Customer Picker Modal -->
    <van-popup v-model:show="showCustomerPicker" position="bottom" :style="{ height: '50%' }" round>
      <div class="picker-head"><h4>选择客户</h4></div>
      <div class="picker-body">
        <div v-for="c in customerResults" :key="c.id" class="picker-item" @click="selectCustomer(c)">
          <div>
            <span>{{ c.name }}</span>
            <span class="text-secondary" style="margin-left:8px">{{ c.phone || '' }}</span>
          </div>
          <span v-if="c.balance > 0" class="text-danger">欠 ¥{{ formatMoney(c.balance) }}</span>
        </div>
        <van-empty v-if="!customerResults.length" description="暂无客户" />
      </div>
    </van-popup>
  </div>
</template>

<style scoped>
.page { padding: 12px; padding-bottom: 100px; min-height: 100vh; background: #f7f8fa; }

/* Customer bar */
.customer-bar {
  display: flex; align-items: center; gap: 12px;
  background: #fff; border-radius: 10px; padding: 12px 16px; margin-bottom: 10px;
}
.customer-bar-title { font-size: 14px; font-weight: 600; color: #646566; white-space: nowrap; }
.customer-actions { display: flex; gap: 8px; flex: 1; }
.customer-actions .van-button { flex: 1; }

/* Card */
.card { background: #fff; border-radius: 10px; padding: 14px 16px; margin-bottom: 10px; }
.card-title { font-size: 14px; font-weight: 600; margin-bottom: 10px; color: #323233; }
.pay-row { display: flex; gap: 8px; flex-wrap: wrap; }

/* Cart */
.cart-list { margin-bottom: 8px; }
.cart-item {
  display: flex; align-items: center; background: #fff;
  border-radius: 10px; padding: 12px 14px; margin-bottom: 8px;
}
.cart-info { flex: 1; min-width: 0; }
.cart-name { font-size: 15px; font-weight: 600; }
.cart-meta { font-size: 12px; color: #969799; margin-top: 2px; }
.cart-qty { display: flex; align-items: center; gap: 4px; margin: 0 8px; }
.qty-input {
  width: 44px; height: 28px; text-align: center; font-size: 14px; font-weight: 700;
  border: 1px solid #ebedf0; border-radius: 6px; outline: none; -moz-appearance: textfield;
}
.qty-input::-webkit-outer-spin-button, .qty-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.cart-sub { font-weight: 700; font-size: 15px; min-width: 64px; text-align: right; color: #ee0a24; }

/* Empty */
.empty-hint { text-align: center; color: #969799; padding: 60px 0; font-size: 14px; }

/* Bottom bar */
.bottom-bar {
  position: fixed; bottom: 50px; left: 0; right: 0; background: #fff;
  padding: 14px 16px calc(14px + env(safe-area-inset-bottom));
  box-shadow: 0 -2px 12px rgba(0,0,0,0.06); z-index: 1;
}
.total-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-size: 15px; }
.total-amount { font-weight: 700; color: #ee0a24; font-size: 24px; }

/* Pickers */
.picker-head { padding: 14px 12px; border-bottom: 1px solid #f0f0f0; }
.picker-head h4 { margin: 0; font-size: 16px; }
.picker-body { padding: 0 12px; overflow-y: auto; max-height: calc(100% - 60px); }
.picker-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 0; border-bottom: 1px solid #f5f5f5; cursor: pointer;
}
.picker-info { flex: 1; min-width: 0; }
.picker-name { font-size: 15px; font-weight: 500; }
.text-secondary { color: #969799; font-size: 12px; }
.text-large { font-weight: 700; font-size: 16px; }
.text-danger { color: #ee0a24; font-size: 12px; }
</style>
