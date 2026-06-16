<template>
  <DefaultLayout>
    <div class="page-header">
      <h2 class="page-title">用户管理</h2>
      <span class="page-desc">管理所有注册用户及订阅状态</span>
    </div>

    <!-- Filter Toolbar -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-input
          v-model="search"
          placeholder="搜索昵称"
          clearable
          @clear="searchUsers"
          @keyup.enter="searchUsers"
          style="width:240px"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-select v-model="statusFilter" placeholder="全部状态" clearable @change="searchUsers" style="width:130px">
          <el-option label="试用中" value="trial" />
          <el-option label="已开通" value="active" />
          <el-option label="已到期" value="expired" />
          <el-option label="已停用" value="disabled" />
        </el-select>
        <el-button type="primary" @click="searchUsers">
          <el-icon style="margin-right:4px"><Search /></el-icon>
          查询
        </el-button>
      </div>
      <div class="toolbar-right">
        <span class="total-hint">共 {{ total }} 个用户</span>
      </div>
    </div>

    <!-- Users Table -->
    <div class="content-card">
      <el-table :data="users" stripe style="width:100%" v-loading="loading">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="nickname" label="昵称" min-width="120">
          <template #default="{ row }">
            <span class="user-name">{{ row.nickname || '用户' + row.id }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType(row.subscription_status)" size="small">
              {{ statusLabel(row.subscription_status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="套餐" width="90">
          <template #default="{ row }">
            {{ planLabel(row.subscription_plan) }}
          </template>
        </el-table-column>
        <el-table-column label="到期时间" width="130">
          <template #default="{ row }">
            <span :class="{ 'text-danger': isExpiringSoon(row.subscription_expires_at) }">
              {{ row.subscription_expires_at ? new Date(row.subscription_expires_at).toLocaleDateString('zh-CN') : (row.trial_expires_at || '-') }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="注册时间" width="130">
          <template #default="{ row }">
            {{ new Date(row.created_at).toLocaleDateString('zh-CN') }}
          </template>
        </el-table-column>
        <el-table-column label="密码" width="80" align="center">
          <template #default="{ row }">
            <el-button size="small" type="warning" plain @click="openResetPwd(row)" title="重置密码">
              <el-icon><View /></el-icon>
            </el-button>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="success" @click="openActivate(row)" v-if="row.subscription_status === 'disabled'">
              启用
            </el-button>
            <el-button size="small" type="primary" @click="openActivate(row)" v-if="row.subscription_status !== 'disabled'">
              {{ row.subscription_status === 'active' ? '续费' : '开通' }}
            </el-button>
            <el-button size="small" type="danger" plain @click="handleDisable(row)" v-if="row.subscription_status !== 'disabled'">
              停用
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="table-footer" v-if="total > 0">
        <el-pagination
          background
          layout="total, prev, pager, next"
          :total="total"
          :page-size="10"
          v-model:current-page="page"
          @current-change="loadUsers"
        />
      </div>
    </div>

    <ActivateDialog
      v-model:visible="dialogVisible"
      :user="selectedUser"
      @success="loadUsers"
    />

    <!-- Reset Password Dialog -->
    <el-dialog v-model="resetPwdVisible" title="重置用户密码" width="420px">
      <div v-if="resetPwdUser">
        <p style="margin-bottom: 12px; color: #64748b">
          为用户 <strong>{{ resetPwdUser.nickname }}</strong> 设置新密码：
        </p>
        <el-input
          v-model="resetPwdForm.newPassword"
          type="password"
          placeholder="请输入新密码（至少6位）"
          show-password
          size="large"
        />
        <div v-if="resetPwdDone" style="margin-top: 16px">
          <el-alert type="success" :closable="false" show-icon>
            <template #title>
              密码已重置，新密码为：<strong style="font-size:16px;color:#16a34a">{{ resetPwdDone }}</strong>
            </template>
          </el-alert>
        </div>
      </div>
      <template #footer>
        <el-button @click="resetPwdVisible = false">{{ resetPwdDone ? '关闭' : '取消' }}</el-button>
        <el-button v-if="!resetPwdDone" type="primary" :loading="resetPwdLoading" @click="handleResetPwd">
          确认重置
        </el-button>
      </template>
    </el-dialog>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getUsers, disableUser, resetUserPassword } from '../api/admin'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, View } from '@element-plus/icons-vue'
import DefaultLayout from '../components/DefaultLayout.vue'
import ActivateDialog from '../components/ActivateDialog.vue'

const users = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const search = ref('')
const statusFilter = ref('')
const dialogVisible = ref(false)
const selectedUser = ref(null)

// Password reset
const resetPwdVisible = ref(false)
const resetPwdUser = ref<any>(null)
const resetPwdForm = ref({ newPassword: '' })
const resetPwdLoading = ref(false)
const resetPwdDone = ref('')

onMounted(() => loadUsers())

function loadUsers() {
  loading.value = true
  getUsers({ page: page.value, page_size: 10, search: search.value, status: statusFilter.value })
    .then((res: any) => {
      users.value = res.data.list || []
      total.value = res.data.total || 0
    })
    .finally(() => loading.value = false)
}

function searchUsers() {
  page.value = 1
  loadUsers()
}

function openActivate(user: any) {
  selectedUser.value = user
  dialogVisible.value = true
}

function handleDisable(user: any) {
  ElMessageBox.confirm(`确定要停用用户「${user.nickname || user.id}」吗？`, '确认停用', {
    confirmButtonText: '确定停用',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    return disableUser(user.id)
  }).then(() => {
    ElMessage.success('已停用')
    loadUsers()
  }).catch(() => {})
}

function openResetPwd(user: any) {
  resetPwdUser.value = user
  resetPwdForm.value.newPassword = ''
  resetPwdDone.value = ''
  resetPwdVisible.value = true
}

function handleResetPwd() {
  if (!resetPwdForm.value.newPassword || resetPwdForm.value.newPassword.length < 6) {
    ElMessage.warning('请输入至少6位新密码')
    return
  }
  resetPwdLoading.value = true
  resetUserPassword(resetPwdUser.value.id, resetPwdForm.value.newPassword)
    .then((res: any) => {
      resetPwdDone.value = res.data.new_password || resetPwdForm.value.newPassword
      ElMessage.success('密码已重置')
    })
    .finally(() => resetPwdLoading.value = false)
}

function isExpiringSoon(dateStr: string) {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const now = new Date()
  const days = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return days >= 0 && days <= 7
}

function statusLabel(s: string) {
  const map: Record<string, string> = { trial: '试用中', active: '已开通', expired: '已到期', disabled: '已停用' }
  return map[s] || s
}

function statusType(s: string) {
  const map: Record<string, string> = { trial: 'warning', active: 'success', expired: 'danger', disabled: 'info' }
  return map[s] || 'info'
}

function planLabel(p: string) {
  const map: Record<string, string> = { custom: '自定义', monthly: '月卡', quarterly: '季卡', yearly: '年卡', permanent: '永久' }
  return map[p] || p || '无'
}
</script>

<style scoped>
.page-header { margin-bottom: 16px; }
.page-title { margin: 0; font-size: 20px; font-weight: 700; color: #1e293b; }
.page-desc { font-size: 13px; color: #94a3b8; margin-top: 4px; display: inline-block; }

/* Toolbar */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 10px;
}
.toolbar-left { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.total-hint { font-size: 13px; color: #94a3b8; }

/* Table */
.content-card {
  background: #fff;
  border-radius: 10px;
  padding: 0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  overflow: hidden;
}
.user-name { font-weight: 500; color: #1e293b; }
.text-danger { color: #ef4444; font-weight: 500; }
.table-footer {
  display: flex;
  justify-content: flex-end;
  padding: 12px 16px;
}
</style>
