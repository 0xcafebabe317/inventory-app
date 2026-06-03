<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()
const baseUrl = import.meta.env.BASE_URL

function goContact() {
  router.push('/contact')
}
</script>

<template>
  <div class="page">
    <div class="lock-icon">🔒</div>
    <h3>使用权限已到期</h3>
    <p class="desc">试用期已结束，请添加管理员微信继续使用</p>
    <div class="qr-card">
      <img :src="`${baseUrl}wechat-admin-qr.png`" alt="管理员微信" class="qr-img" />
      <p class="qr-tip">截屏或长按保存图片，微信扫码添加</p>
    </div>
    <van-button round type="primary" block @click="goContact">联系管理员</van-button>
  </div>
</template>

<style scoped>
.page {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; min-height: 100vh; background: #f7f8fa; padding: 40px;
}
.lock-icon { font-size: 64px; margin-bottom: 20px; }
h3 { font-size: 20px; margin-bottom: 12px; }
.desc { color: #969799; text-align: center; margin-bottom: 24px; font-size: 14px; }
.qr-card {
  background: #fff; border-radius: 12px; padding: 24px 24px 16px;
  text-align: center; margin-bottom: 24px; width: 100%; max-width: 280px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
.qr-img { width: 200px; height: 200px; border-radius: 8px; }
.qr-tip { color: #969799; font-size: 12px; margin-top: 12px; }
</style>
