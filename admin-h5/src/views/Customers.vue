<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getCustomers } from '../api/admin'
import { formatMoney } from '../utils/format'

const router = useRouter()
const customers = ref<any[]>([])
const loading = ref(false)

onMounted(async () => {
  loading.value = true
  try {
    const res: any = await getCustomers({ page_size: 200 })
    customers.value = res.data?.list || []
  } catch { /* */ }
  loading.value = false
})

function goDetail(id: number) { router.push(`/customer-detail/${id}`) }
</script>

<template>
  <div class="page">
    <van-nav-bar title="客户管理" left-text="返回" left-arrow @click-left="$router.back()" />
    <van-loading v-if="loading" class="loading" />
    <div v-for="c in customers" :key="c.id" class="item" @click="goDetail(c.id)">
      <div class="item-main">
        <div class="item-name">{{ c.name }}</div>
        <div class="balance" :class="{ red: (c.balance || 0) > 0 }">
          应收 ¥{{ formatMoney(c.balance || 0) }}
        </div>
      </div>
      <div class="text-secondary">{{ c.phone || '无手机号' }}</div>
    </div>
    <van-empty v-if="!loading && !customers.length" description="暂无客户" />
  </div>
</template>

<style scoped>
.page { background: #f7f8fa; min-height: 100vh; }
.loading { display: flex; justify-content: center; padding: 40px; }
.item { background: #fff; border-radius: 8px; margin: 8px 12px; padding: 14px; }
.item-main { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.item-name { font-size: 15px; font-weight: 600; }
.balance { font-weight: 600; font-size: 14px; }
.balance.red { color: #ee0a24; }
.text-secondary { color: #969799; font-size: 12px; }
</style>
