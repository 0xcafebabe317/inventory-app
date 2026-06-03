import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface CartItem {
  product: {
    id: number
    name: string
    sale_price: number
    purchase_price?: number
    spec?: string
    unit?: string
    stock_qty?: number
  }
  qty: number
}

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>([])

  const totalAmount = computed(() => {
    return items.value.reduce((sum, item) => sum + item.product.sale_price * item.qty, 0)
  })

  const totalPurchaseAmount = computed(() => {
    return items.value.reduce((sum, item) => sum + (item.product.purchase_price || item.product.sale_price) * item.qty, 0)
  })

  const itemCount = computed(() => items.value.length)
  const totalQty = computed(() => items.value.reduce((sum, item) => sum + item.qty, 0))
  function addItem(product: CartItem['product']) {
    const existing = items.value.find(i => i.product.id === product.id)
    if (existing) {
      existing.qty++
    } else {
      items.value.push({ product, qty: 1 })
    }
  }

  function removeItem(index: number) {
    items.value.splice(index, 1)
  }

  function updateQty(index: number, delta: number) {
    const item = items.value[index]
    if (!item) return
    item.qty = Math.max(1, item.qty + delta)
  }

  function clearCart() {
    items.value = []
  }

  return { items, totalAmount, totalPurchaseAmount, totalQty, itemCount, addItem, removeItem, updateQty, clearCart }
})
