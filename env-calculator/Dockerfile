# 简化的 Dockerfile - 专注启动成功
FROM node:18-alpine

WORKDIR /app

# 复制 package.json 并安装依赖
COPY package*.json ./
RUN npm install --no-audit --no-fund

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# 暴露端口
EXPOSE 3000

# 使用调试启动脚本，输出详细信息
CMD ["node", "debug-start.js"]
