#!/bin/bash
# ==============================================
# 进销存系统 — 服务器部署/更新脚本
# 域名：www.tzjxc.online
# 服务器 IP：43.136.182.83
# ==============================================
set -e

REMOTE_HOST="ubuntu@43.136.182.83"
REMOTE_DIR="~/inventory-app"

echo "🚀 部署进销存系统到 ${REMOTE_HOST}..."
echo "🌐 域名: https://www.tzjxc.online"
echo ""

# 1. 同步项目文件（排除不需要的）
echo "📦 同步代码..."
rsync -avz --delete \
  --exclude='.git' \
  --exclude='.gitignore' \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.DS_Store' \
  --exclude='serverZMMM.txt' \
  --exclude='需求.txt' \
  --exclude='generate_ppt.py' \
  --exclude='deploy.sh' \
  ./ "${REMOTE_HOST}:${REMOTE_DIR}/"

# 2. 重启服务
echo "🔄 重启 Docker 服务（应用新配置）..."
ssh "${REMOTE_HOST}" "cd ${REMOTE_DIR} && docker compose down && docker compose up -d --build"

# 3. 等待健康检查
echo "⏳ 等待服务启动..."
sleep 10

# 4. 验证
echo "🔍 验证服务状态..."
ssh "${REMOTE_HOST}" "cd ${REMOTE_DIR} && docker compose ps"
ssh "${REMOTE_HOST}" "curl -s http://localhost/api/ping"

echo ""
echo "✅ 部署完成！"
echo ""
echo "📋 后续步骤："
echo "  1. 微信开发者工具打开 mini-app/ 目录"
echo "  2. 设置 → 不校验合法域名（开发阶段勾选）"
echo "  3. 编译预览，扫码测试"
echo ""
echo "  🔐 生产环境上线需要："
echo "  4. 绑定 HTTPS 域名"
echo "  5. 在微信公众平台配置 request 合法域名"
echo "  6. 将 SSL 证书放入 nginx/ssl/ 并启用 HTTPS"
