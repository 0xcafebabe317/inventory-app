<template>
  <router-view />
</template>

<style>
/* Global Reset & Theme */
:root {
  --app-primary: #2563eb;
  --app-primary-light: #3b82f6;
  --app-primary-bg: #eff6ff;
  --app-bg: #f0f4f8;
  --app-text: #1e293b;
  --app-text-secondary: #64748b;
  --app-border: #e5e7eb;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
    'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial,
    sans-serif;
  background: var(--app-bg);
  color: var(--app-text);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Element Plus overrides */
.el-card {
  border-radius: 10px !important;
  border: none !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06) !important;
}

.el-button--primary {
  --el-button-bg-color: #2563eb;
  --el-button-border-color: #2563eb;
  --el-button-hover-bg-color: #3b82f6;
  --el-button-hover-border-color: #3b82f6;
}

.el-pagination.is-background .el-pager li.is-active {
  background-color: #2563eb !important;
}

.el-menu {
  border-right: none !important;
}
</style>
