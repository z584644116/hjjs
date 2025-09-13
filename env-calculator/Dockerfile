# 简化的 Dockerfile - 专注启动成功
FROM node:18-alpine

WORKDIR /app

# 复制所有文件
COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# 暴露端口
EXPOSE 3000

# 复制调试启动脚本
COPY debug-start.js ./

# 使用调试启动脚本，输出详细信息
CMD ["node", "debug-start.js"]
