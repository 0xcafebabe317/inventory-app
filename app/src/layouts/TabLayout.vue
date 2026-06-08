<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
const active = ref(0)

const tabs = [
  { name: 'Dashboard', title: '首页', icon: 'home-o' },
  { name: 'Checkout', title: '开单', icon: 'add-o' },
  { name: 'Purchase', title: '进货', icon: 'cart-o' },
  { name: 'Inventory', title: '库存', icon: 'apps-o' },
  { name: 'Mine', title: '我的', icon: 'user-o' }
]

// Sync active tab with current route
watch(() => route.name, (name) => {
  const idx = tabs.findIndex(t => t.name === name)
  if (idx >= 0) active.value = idx
}, { immediate: true })

function onTabChange(idx: number) {
  const tab = tabs[idx]
  if (tab) {
    router.replace({ name: tab.name })
  }
}
</script>

<template>
  <div class="tab-layout">
    <div class="tab-content">
      <router-view />
    </div>
    <van-tabbar :model-value="active" @update:model-value="onTabChange" safe-area-inset-bottom>
      <van-tabbar-item v-for="tab in tabs" :key="tab.name" :icon="tab.icon">
        {{ tab.title }}
      </van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<style scoped>
.tab-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
.tab-content {
  flex: 1;
  overflow-y: auto;
  background: #f7f8fa;
  padding-bottom: 8px;
}
</style>
