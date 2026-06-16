<template>
  <DefaultLayout>
    <div class="page-header">
      <h2 class="page-title">运营概览</h2>
      <span class="page-desc">实时查看用户数据和订阅情况</span>
    </div>

    <!-- Stat Cards -->
    <el-row :gutter="20" class="stat-row">
      <el-col :span="8" v-for="card in cards" :key="card.label">
        <div class="stat-card" :style="{ borderTopColor: card.color }">
          <div class="stat-icon" :style="{ background: card.bg }">
            <el-icon :size="24" :color="card.color">
              <User v-if="card.key === 'users'" />
              <Star v-else-if="card.key === 'active'" />
              <Plus v-else />
            </el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-label">{{ card.label }}</div>
            <div class="stat-value">{{ card.value }}</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- Expiring Users Table -->
    <div class="content-card">
      <div class="card-header">
        <span class="card-title">即将到期用户（未来7天）</span>
        <el-tag type="warning" size="small">{{ expiringUsers.length }} 人</el-tag>
      </div>
      <el-table :data="expiringUsers" stripe style="width:100%">
        <el-table-column prop="nickname" label="昵称" min-width="120" />
        <el-table-column prop="nickname" label="昵称" width="140" />
        <el-table-column label="套餐" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="planTagType(row.subscription_plan)">
              {{ planLabel(row.subscription_plan) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="到期时间" width="140">
          <template #default="{ row }">
            <span class="expiry-date">
              {{ new Date(row.subscription_expires_at).toLocaleDateString('zh-CN') }}
            </span>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!expiringUsers.length" description="暂无即将到期用户" :image-size="80" />
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getDashboard } from '../api/admin'
import { User, Star, Plus } from '@element-plus/icons-vue'
import DefaultLayout from '../components/DefaultLayout.vue'

const cards = ref([
  { key: 'users', label: '总用户数', value: 0, color: '#2563eb', bg: '#eff6ff' },
  { key: 'active', label: '付费用户', value: 0, color: '#16a34a', bg: '#f0fdf4' },
  { key: 'new', label: '本月新增', value: 0, color: '#f59e0b', bg: '#fffbeb' }
])
const expiringUsers = ref<any[]>([])

onMounted(() => {
  getDashboard().then((res: any) => {
    const d = res.data
    cards.value[0].value = d.total_users ?? 0
    cards.value[1].value = d.active_users ?? 0
    cards.value[2].value = d.new_this_month ?? 0
    expiringUsers.value = d.expiring_users || []
  })
})

function planLabel(p: string) {
  const map: Record<string, string> = { custom: '自定义', monthly: '月卡', quarterly: '季卡', yearly: '年卡', permanent: '永久' }
  return map[p] || p || '无'
}

function planTagType(p: string) {
  const map: Record<string, string> = { monthly: '', quarterly: 'warning', yearly: 'primary', permanent: 'success' }
  return (map[p] || 'info') as any
}
</script>

<style scoped>
.page-header { margin-bottom: 20px; }
.page-title { margin: 0; font-size: 20px; font-weight: 700; color: #1e293b; }
.page-desc { font-size: 13px; color: #94a3b8; margin-top: 4px; display: inline-block; }

/* Stat cards */
.stat-row { margin-bottom: 20px; }
.stat-card {
  background: #fff;
  border-radius: 10px;
  padding: 20px 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  border-top: 3px solid;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  transition: box-shadow 0.2s;
}
.stat-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.stat-info { flex: 1; }
.stat-label { font-size: 13px; color: #64748b; margin-bottom: 4px; }
.stat-value { font-size: 32px; font-weight: 700; color: #1e293b; line-height: 1; }

/* Content card */
.content-card {
  background: #fff;
  border-radius: 10px;
  padding: 20px 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.card-title { font-size: 15px; font-weight: 600; color: #1e293b; }
.expiry-date { color: #ef4444; font-weight: 500; }
</style>
