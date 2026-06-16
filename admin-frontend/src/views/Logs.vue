<template>
  <DefaultLayout>
    <div class="page-header">
      <h2 class="page-title">操作日志</h2>
      <span class="page-desc">管理员对用户的开通、续费、停用记录</span>
    </div>

    <div class="content-card">
      <el-table :data="logs" stripe style="width:100%" v-loading="loading">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="admin_name" label="操作人" width="120">
          <template #default="{ row }">
            <span class="admin-name">{{ row.admin_name || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="user_nickname" label="用户昵称" width="140" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.user_nickname || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="90">
          <template #default="{ row }">
            <el-tag :type="actionType(row.action)" size="small">{{ actionLabel(row.action) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="套餐" width="90">
          <template #default="{ row }">
            {{ planLabel(row.plan) }}
          </template>
        </el-table-column>
        <el-table-column label="到期时间" width="130">
          <template #default="{ row }">
            {{ row.expires_at ? new Date(row.expires_at).toLocaleDateString('zh-CN') : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="90" show-overflow-tooltip />
        <el-table-column label="操作时间" width="170">
          <template #default="{ row }">
            {{ new Date(row.created_at).toLocaleString('zh-CN') }}
          </template>
        </el-table-column>
      </el-table>

      <div class="table-footer" v-if="total > 0">
        <el-pagination
          background
          layout="total, prev, pager, next"
          :total="total"
          :page-size="20"
          v-model:current-page="page"
          @current-change="loadLogs"
        />
      </div>

      <el-empty v-if="!loading && !logs.length" description="暂无操作记录" :image-size="80" />
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getOperationLogs } from '../api/admin'
import DefaultLayout from '../components/DefaultLayout.vue'

const logs = ref([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)

onMounted(() => loadLogs())

function loadLogs() {
  loading.value = true
  getOperationLogs({ page: page.value, page_size: 10 })
    .then((res: any) => {
      logs.value = res.data.list || []
      total.value = res.data.total || 0
    })
    .finally(() => loading.value = false)
}

function actionLabel(a: string) {
  const map: Record<string, string> = { activate: '开通', renew: '续费', disable: '停用' }
  return map[a] || a
}
function actionType(a: string) {
  const map: Record<string, string> = { activate: 'success', renew: 'primary', disable: 'danger' }
  return map[a] || 'info'
}
function planLabel(p: string) {
  const map: Record<string, string> = { custom: '自定义', monthly: '月卡', quarterly: '季卡', yearly: '年卡', permanent: '永久' }
  return map[p] || p || ''
}
</script>

<style scoped>
.page-header { margin-bottom: 16px; }
.page-title { margin: 0; font-size: 20px; font-weight: 700; color: #1e293b; }
.page-desc { font-size: 13px; color: #94a3b8; margin-top: 4px; display: inline-block; }

.content-card {
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
.admin-name { font-weight: 500; color: #1e293b; }
.table-footer {
  display: flex;
  justify-content: flex-end;
  padding: 12px 16px;
}
</style>
