#!/bin/sh
set -e

# 确保存储目录权限正确（处理挂载卷权限问题）
if [ -d "/app/data" ]; then
    chown -R nextjs:nodejs /app/data || echo "Warning: Could not change ownership of /app/data"
fi

if [ -d "/app/backups" ]; then
    chown -R nextjs:nodejs /app/backups || echo "Warning: Could not change ownership of /app/backups"
fi

# 切换到 nextjs 用户并启动应用
exec su-exec nextjs node server.js
