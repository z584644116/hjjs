# ClawCloud Run 优化的 Dockerfile
FROM node:18-alpine AS base

# 安装依赖
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# 复制包管理文件（构建阶段需要 devDependencies）
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

# 构建应用
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 设置构建环境变量
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production

# 构建应用
RUN npm run build

# 生产镜像
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
ENV CLAW_CLOUD_RUN true

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 创建存储目录
RUN mkdir -p /app/data /app/backups
RUN chown -R nextjs:nodejs /app/data /app/backups

# 复制构建产物
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 切换到非 root 用户
USER nextjs

# 暴露端口
EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# 启动应用
CMD ["node", "server.js"]
