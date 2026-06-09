<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { getCustomers, createCustomer } from '../api/customer'
import { updateCustomer } from '../api/customer'

const router = useRouter()
const customers = ref<any[]>([])
const loading = ref(false)

const showDialog_ = ref(false)
const editMode = ref(false)
const editId = ref<number | null>(null)
const form = ref({ name: '', phone: '', wechat: '', remark: '' })
const submitting = ref(false)

onMounted(() => loadCustomers())

async function loadCustomers() {
  loading.value = true
  try {
    const res: any = await getCustomers()
    customers.value = res.data || []
  } catch { /* */ }
  finally { loading.value = false }
}

function openAdd() {
  editMode.value = false
  editId.value = null
  form.value = { name: '', phone: '', wechat: '', remark: '' }
  showDialog_.value = true
}

function openEdit(c: any) {
  editMode.value = true
  editId.value = c.id
  form.value = {
    name: c.name || '',
    phone: c.phone || '',
    wechat: c.wechat || '',
    remark: c.remark || ''
  }
  showDialog_.value = true
}

async function handleSubmit() {
  if (!form.value.name) { showToast('请输入客户名称'); return }
  submitting.value = true
  try {
    if (editMode.value && editId.value) {
      await updateCustomer(editId.value, form.value)
      showToast('修改成功')
    } else {
      await createCustomer(form.value)
      showToast('添加成功')
    }
    showDialog_.value = false
    loadCustomers()
  } catch (err: any) {
    showToast(err.response?.data?.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

function goTransactions(c: any) {
  router.push(`/customer-transactions/${c.id}`)
}
</script>

<template>
  <div class="page">
    <van-nav-bar title="客户管理" left-text="返回" left-arrow @click-left="$router.back()" />

    <div class="toolbar">
      <van-button type="primary" size="small" icon="plus" @click="openAdd">新增客户</van-button>
    </div>

    <van-empty v-if="!loading && !customers.length" description="暂无客户">
      <van-button type="primary" size="small" @click="openAdd">添加第一个客户</van-button>
    </van-empty>

    <div v-for="c in customers" :key="c.id" class="item-card">
      <div class="card-header">
        <div class="card-avatar">👤</div>
        <div class="card-info">
          <div class="item-name">{{ c.name }}</div>
          <div v-if="c.phone" class="item-detail">电话: {{ c.phone }}</div>
          <div v-if="c.wechat" class="item-detail">微信: {{ c.wechat }}</div>
          <div v-if="c.remark" class="text-secondary">{{ c.remark }}</div>
        </div>
        <div v-if="c.balance > 0" class="balance-badge">待还: ¥{{ (c.balance || 0).toFixed(2) }}</div>
      </div>
      <div class="card-actions">
        <van-button size="small" plain type="primary" icon="edit" @click="openEdit(c)">修改信息</van-button>
        <van-button size="small" plain icon="records" @click="goTransactions(c)">交易记录</van-button>
      </div>
    </div>

    <!-- Add/Edit Dialog -->
    <van-dialog v-model:show="showDialog_" :title="editMode ? '编辑客户' : '新增客户'"
      show-cancel-button :confirm-loading="submitting" @confirm="handleSubmit">
      <div class="dialog-form">
        <van-field v-model="form.name" label="名称" placeholder="请输入客户名称" />
        <van-field v-model="form.phone" label="电话" placeholder="请输入电话号码" />
        <van-field v-model="form.wechat" label="微信" placeholder="请输入微信号" />
        <van-field v-model="form.remark" label="备注" placeholder="请输入备注" />
      </div>
    </van-dialog>
  </div>
</template>

<style scoped>
.page { background: #f7f8fa; min-height: 100vh; padding-bottom: 40px; }
.toolbar { padding: 12px 16px; text-align: right; }
.item-card {
  background: #fff; border-radius: 12px; padding: 16px;
  margin: 8px 16px; position: relative;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}
.card-header { display: flex; align-items: flex-start; gap: 12px; }
.card-avatar {
  width: 42px; height: 42px; min-width: 42px; border-radius: 10px;
  background: linear-gradient(135deg, #fef3e2, #fde8c8);
  display: flex; align-items: center; justify-content: center; font-size: 20px;
}
.card-info { flex: 1; min-width: 0; }
.item-name { font-size: 16px; font-weight: 600; color: #1a1a1a; margin-bottom: 4px; }
.item-detail { font-size: 13px; color: #646566; margin-bottom: 2px; }
.text-secondary { color: #969799; font-size: 12px; margin-top: 2px; }
.balance-badge {
  color: #ee0a24; font-size: 13px; font-weight: 600;
  background: #fff0f0; padding: 4px 10px; border-radius: 12px; white-space: nowrap;
}
.card-actions {
  display: flex; gap: 10px; margin-top: 14px; padding-top: 14px;
  border-top: 1px solid #f0f0f0;
}
.card-actions .van-button { flex: 1; }
.dialog-form { padding: 12px 0; }
</style>
