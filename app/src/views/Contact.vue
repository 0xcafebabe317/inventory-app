<script setup lang="ts">
const baseUrl = import.meta.env.BASE_URL
</script>

<template>
  <div class="page">
    <van-nav-bar title="联系管理员" left-text="返回" left-arrow @click-left="$router.back()" />

    <div class="contact-card">
      <h3>添加管理员微信</h3>
      <p>如需开通权限或咨询问题，请添加管理员微信</p>
      <div class="qr-wrapper">
        <img :src="`${baseUrl}wechat-admin-qr.png`" alt="管理员微信" class="qr-img" />
        <span>截屏或长按保存图片，微信扫码添加</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { background: #f7f8fa; min-height: 100vh; }
.contact-card {
  text-align: center; padding: 40px 20px;
}
.contact-card h3 { font-size: 20px; margin-bottom: 12px; }
.contact-card p { color: #969799; font-size: 14px; margin-bottom: 40px; }
.qr-wrapper {
  display: flex; flex-direction: column; align-items: center; gap: 16px;
  padding: 30px; background: #fff; border-radius: 12px; margin: 0 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
.qr-img { width: 200px; height: 200px; border-radius: 8px; }
.qr-wrapper span { color: #969799; font-size: 14px; }
</style>
