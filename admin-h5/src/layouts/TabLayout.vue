<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
const active = ref('dashboard')

watch(() => route.name, (n) => {
  const map: Record<string, string> = {
    Dashboard: 'dashboard', Products: 'products', Sales: 'sales', More: 'more'
  }
  active.value = map[n as string] || 'dashboard'
}, { immediate: true })

function onChange(name: string) {
  router.push({ name })
}
</script>

<template>
  <router-view />
  <van-tabbar v-model="active" @change="onChange" route safe-area-inset-bottom>
    <van-tabbar-item name="dashboard" icon="chart-trending-o" to="/dashboard">概览</van-tabbar-item>
    <van-tabbar-item name="products" icon="goods-o" to="/products">商品</van-tabbar-item>
    <van-tabbar-item name="sales" icon="orders-o" to="/sales">订单</van-tabbar-item>
    <van-tabbar-item name="more" icon="manager-o" to="/more">更多</van-tabbar-item>
  </van-tabbar>
</template>
