<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import { getProducts, createProduct, updateProduct } from '../api/admin'

const route = useRoute()
const router = useRouter()
const productId = route.params.id ? Number(route.params.id) : null
const isEdit = !!productId
const submitting = ref(false)

const form = ref({
  name: '', barcode: '', spec: '', unit: '个',
  sale_price: '', wholesale_price: '', purchase_price: '', min_stock: '10', category: ''
})

onMounted(async () => {
  if (isEdit) {
    try {
      const res: any = await getProducts({ page_size: 200 })
      const p = (res.data?.list || []).find((p: any) => p.id === productId)
      if (p) {
        form.value = {
          name: p.name || '', barcode: p.barcode || '', spec: p.spec || '', unit: p.unit || '个',
          sale_price: String(p.sale_price || ''), wholesale_price: String(p.wholesale_price || ''), purchase_price: String(p.purchase_price || ''),
          min_stock: String(p.min_stock || '10'), category: p.category || ''
        }
      }
    } catch { /* */ }
  }
})

async function handleSubmit() {
  if (!form.value.name) { showToast('请输入商品名称'); return }
  submitting.value = true
  try {
    const data = {
      ...form.value,
      sale_price: parseFloat(form.value.sale_price) || 0,
      wholesale_price: parseFloat(form.value.wholesale_price) || 0,
      purchase_price: parseFloat(form.value.purchase_price) || 0,
      min_stock: parseInt(form.value.min_stock) || 10
    }
    if (isEdit) await updateProduct(productId!, data)
    else await createProduct(data)
    showToast(isEdit ? '保存成功' : '添加成功')
    router.back()
  } catch (err: any) {
    showToast(err.response?.data?.message || '操作失败')
  } finally { submitting.value = false }
}
</script>

<template>
  <div class="page">
    <van-nav-bar :title="isEdit ? '编辑商品' : '新增商品'" left-text="返回" left-arrow @click-left="$router.back()" />
    <van-form @submit="handleSubmit">
      <van-cell-group inset>
        <van-field v-model="form.name" label="名称" placeholder="商品名称" :rules="[{ required: true }]" />
        <van-field v-model="form.barcode" label="条码" placeholder="条码号" />
        <van-field v-model="form.spec" label="规格" placeholder="规格型号" />
        <van-field v-model="form.unit" label="单位" placeholder="个/箱/件" />
        <van-field v-model="form.sale_price" type="digit" label="售价" placeholder="0.00" />
        <van-field v-model="form.wholesale_price" type="digit" label="批发价" placeholder="0.00" />
        <van-field v-model="form.purchase_price" type="digit" label="进价" placeholder="0.00" />
        <van-field v-model="form.min_stock" type="digit" label="最低库存" placeholder="10" />
        <van-field v-model="form.category" label="分类" placeholder="分类" />
      </van-cell-group>
      <div style="margin: 20px 16px">
        <van-button round block type="primary" native-type="submit" :loading="submitting">
          {{ isEdit ? '保存修改' : '添加商品' }}
        </van-button>
      </div>
    </van-form>
  </div>
</template>

<style scoped>
.page { background: #f7f8fa; min-height: 100vh; }
</style>
