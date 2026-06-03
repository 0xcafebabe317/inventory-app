<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showDialog } from 'vant'
import { getSuppliers } from '../api/supplier'
import { createSupplier, updateSupplier } from '../api/supplier'

const router = useRouter()
const suppliers = ref<any[]>([])
const loading = ref(false)

const showDialog_ = ref(false)
const editMode = ref(false)
const editId = ref<number | null>(null)
const form = ref({ name: '', contact_name: '', phone: '', remark: '' })
const submitting = ref(false)

onMounted(() => loadSuppliers())

async function loadSuppliers() {
  loading.value = true
  try {
    const res: any = await getSuppliers()
    suppliers.value = res.data || []
  } catch { /* */ }
  finally { loading.value = false }
}

function openAdd() {
  editMode.value = false
  editId.value = null
  form.value = { name: '', contact_name: '', phone: '', remark: '' }
  showDialog_.value = true
}

function openEdit(s: any) {
  editMode.value = true
  editId.value = s.id
  form.value = {
    name: s.name || '',
    contact_name: s.contact_name || '',
    phone: s.phone || '',
    remark: s.remark || ''
  }
  showDialog_.value = true
}

async function handleSubmit() {
  if (!form.value.name) { showToast('请输入进货商名称'); return }
  submitting.value = true
  try {
    if (editMode.value && editId.value) {
      await updateSupplier(editId.value, form.value)
      showToast('修改成功')
    } else {
      await createSupplier(form.value)
      showToast('添加成功')
    }
    showDialog_.value = false
    loadSuppliers()
  } catch (err: any) {
    showToast(err.response?.data?.message || '操作失败')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="page">
    <van-nav-bar title="进货商管理" left-text="返回" left-arrow @click-left="$router.back()" />

    <div class="toolbar">
      <van-button type="primary" size="small" @click="openAdd">新增进货商</van-button>
    </div>

    <van-empty v-if="!loading && !suppliers.length" description="暂无进货商">
      <van-button type="primary" size="small" @click="openAdd">添加第一个进货商</van-button>
    </van-empty>

    <div v-for="s in suppliers" :key="s.id" class="item-card" @click="openEdit(s)">
      <div class="item-name">{{ s.name }}</div>
      <div v-if="s.contact_name" class="item-detail">联系人: {{ s.contact_name }}</div>
      <div v-if="s.phone" class="item-detail">电话: {{ s.phone }}</div>
      <div v-if="s.remark" class="text-secondary">{{ s.remark }}</div>
    </div>

    <!-- Add/Edit Dialog -->
    <van-dialog v-model:show="showDialog_" :title="editMode ? '编辑进货商' : '新增进货商'"
      show-cancel-button :confirm-loading="submitting" @confirm="handleSubmit">
      <div class="dialog-form">
        <van-field v-model="form.name" label="名称" placeholder="请输入进货商名称" />
        <van-field v-model="form.contact_name" label="联系人" placeholder="请输入联系人姓名" />
        <van-field v-model="form.phone" label="电话" placeholder="请输入电话号码" />
        <van-field v-model="form.remark" label="备注" placeholder="请输入备注" />
      </div>
    </van-dialog>
  </div>
</template>

<style scoped>
.page { background: #f7f8fa; min-height: 100vh; }
.toolbar { padding: 12px 16px; text-align: right; }
.item-card {
  background: #fff; border-radius: 10px; padding: 16px;
  margin: 8px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.item-name { font-size: 16px; font-weight: 600; margin-bottom: 6px; }
.item-detail { font-size: 13px; color: #646566; margin-bottom: 2px; }
.text-secondary { color: #969799; font-size: 12px; margin-top: 4px; }
.dialog-form { padding: 12px 0; }
</style>
