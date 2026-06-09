<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import { getProducts, createProduct, updateProduct } from '../api/product'
import { getSuppliers } from '../api/supplier'

const route = useRoute()
const router = useRouter()
const productId = route.params.id ? Number(route.params.id) : null
const isEdit = !!productId
const submitting = ref(false)

const form = ref({
  name: '',
  spec: '',
  unit: '',
  sale_price: '',
  wholesale_price: '',
  purchase_price: '',
  min_stock: '',
  category: '',
  supplier_id: null as number | null,
  image_url: ''
})

const showSupplierPicker = ref(false)
const suppliers = ref<any[]>([])
const selectedSupplier = ref<any>(null)

onMounted(async () => {
  if (isEdit) {
    try {
      const res: any = await getProducts({ page_size: 200 })
      const products = res.data?.list || []
      const p = products.find((p: any) => p.id === productId)
      if (p) {
        form.value = {
          name: p.name || '',
          spec: p.spec || '',
          unit: p.unit || '',
          sale_price: p.sale_price != null ? String(p.sale_price) : '',
          wholesale_price: p.wholesale_price != null ? String(p.wholesale_price) : '',
          purchase_price: p.purchase_price != null ? String(p.purchase_price) : '',
          min_stock: p.min_stock != null ? String(p.min_stock) : '',
          category: p.category || '',
          supplier_id: p.supplier_id || null,
          image_url: p.image_url || ''
        }
        if (p.supplier) {
          selectedSupplier.value = p.supplier
        }
      }
    } catch { /* */ }
  }
})

async function loadSuppliers() {
  if (suppliers.value.length) {
    showSupplierPicker.value = true
    return
  }
  try {
    const res: any = await getSuppliers()
    suppliers.value = res.data || []
  } catch { /* */ }
  showSupplierPicker.value = true
}

function selectSupplier(s: any) {
  selectedSupplier.value = s
  form.value.supplier_id = s.id
  showSupplierPicker.value = false
}

async function handleSubmit() {
  if (!form.value.name) { showToast('请输入商品名称'); return }
  submitting.value = true
  try {
    const data: any = {
      name: form.value.name,
      spec: form.value.spec,
      unit: form.value.unit,
      sale_price: parseFloat(form.value.sale_price) || 0,
      wholesale_price: parseFloat(form.value.wholesale_price) || 0,
      purchase_price: parseFloat(form.value.purchase_price) || 0,
      min_stock: parseInt(form.value.min_stock) || 0,
      supplier_id: form.value.supplier_id || 0
    }
    if (isEdit) await updateProduct(productId!, data)
    else await createProduct(data)
    showToast(isEdit ? '保存成功' : '添加成功')
    router.back()
  } catch (err: any) {
    showToast(err.response?.data?.message || '操作失败')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="page">
    <van-nav-bar :title="isEdit ? '编辑商品' : '新增商品'" left-text="返回" left-arrow @click-left="$router.back()" />

    <van-form @submit="handleSubmit">
      <van-cell-group inset>
        <van-field v-model="form.name" label="名称" placeholder="请输入商品名称" :rules="[{ required: true, message: '请输入商品名称' }]" />
        <van-field v-model="form.spec" label="规格" placeholder="请输入规格型号" />
        <van-field v-model="form.unit" label="单位" placeholder="请输入单位，如个/箱/件" />
        <van-field v-model="form.sale_price" type="digit" label="售价" placeholder="请输入售价" />
        <van-field v-model="form.wholesale_price" type="digit" label="批发价" placeholder="请输入批发价" />
        <van-field v-model="form.purchase_price" type="digit" label="进价" placeholder="请输入进价" />
        <van-field v-model="form.min_stock" type="digit" label="最低库存" placeholder="请输入最低库存预警值" />

        <!-- Supplier -->
        <van-field
          :model-value="selectedSupplier?.name || ''"
          label="进货商"
          placeholder="请选择进货商"
          readonly
          is-link
          @click="loadSuppliers"
        />
      </van-cell-group>

      <div style="margin: 20px 16px">
        <van-button round block type="primary" native-type="submit" :loading="submitting">
          {{ isEdit ? '保存修改' : '添加商品' }}
        </van-button>
      </div>
    </van-form>

    <!-- Supplier Picker -->
    <van-popup v-model:show="showSupplierPicker" position="bottom" :style="{ height: '50%' }">
      <div class="picker-head"><h4>选择进货商</h4></div>
      <div class="picker-body">
        <div v-for="s in suppliers" :key="s.id" class="picker-item" @click="selectSupplier(s)">
          <span>{{ s.name }}</span>
          <span class="text-secondary">{{ s.phone || '' }}</span>
        </div>
        <van-empty v-if="!suppliers.length" description="暂无进货商" />
      </div>
    </van-popup>
  </div>
</template>

<style scoped>
.page { background: #f7f8fa; min-height: 100vh; }
.picker-head { padding: 12px; border-bottom: 1px solid #f0f0f0; }
.picker-body { padding: 0 12px; overflow-y: auto; max-height: calc(100% - 60px); }
.picker-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 0; border-bottom: 1px solid #f5f5f5;
}
.text-secondary { color: #969799; font-size: 12px; }
</style>
