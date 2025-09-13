# 最简单的 Next.js Dockerfile
FROM node:18-alpine

WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装依赖（包括 devDependencies，构建需要）
RUN npm install --no-audit --no-fund

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 创建数据目录
RUN mkdir -p /app/data

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["npm", "start"]
