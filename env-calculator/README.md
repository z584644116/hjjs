# 环境计算器 (Environment Calculator)

专业的环境监测计算工具，支持采样嘴计算等功能。基于 Next.js 构建，当前版本支持本地开发、GHCR 镜像发布和 Linux 服务器 Docker 部署。

## 快速开始

### 本地开发

```bash
# 克隆项目
git clone <your-repo-url>
cd env-calculator

# 安装依赖
npm install

# 设置本地存储环境
npm run setup

# 启动开发服务器
npm run dev
```

访问 [http://localhost:9999](http://localhost:9999) 查看应用。

## Linux 服务器部署

### 推荐方式：直接拉 GHCR 镜像

先确认 GitHub Actions 已经成功构建过镜像，然后在 Linux 服务器执行：

```bash
# 1. 创建数据目录
mkdir -p ~/env-calculator/data ~/env-calculator/backups
cd ~/env-calculator

# 2. 拉取镜像
docker pull ghcr.io/z584644116/env-calculator:latest

# 3. 启动容器
docker run -d \
  --name env-calculator \
  --restart unless-stopped \
  -p 9999:9999 \
  -v ~/env-calculator/data:/app/data \
  -v ~/env-calculator/backups:/app/backups \
  ghcr.io/z584644116/env-calculator:latest
```

部署完成后访问：`http://你的服务器IP:9999`

### 备用方式：服务器本地构建

如果 GHCR 镜像还没准备好，也可以：

```bash
git clone https://github.com/z584644116/hjjs.git
cd hjjs/env-calculator
docker build -t env-calculator .
mkdir -p data backups
docker run -d \
  --name env-calculator \
  --restart unless-stopped \
  -p 9999:9999 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/backups:/app/backups \
  env-calculator
```

## 更新部署

### GHCR 镜像更新

```bash
docker pull ghcr.io/z584644116/env-calculator:latest
docker rm -f env-calculator
docker run -d \
  --name env-calculator \
  --restart unless-stopped \
  -p 9999:9999 \
  -v ~/env-calculator/data:/app/data \
  -v ~/env-calculator/backups:/app/backups \
  ghcr.io/z584644116/env-calculator:latest
```

### 本地源码更新

```bash
cd ~/hjjs/env-calculator
git pull
docker build -t env-calculator .
docker rm -f env-calculator
docker run -d \
  --name env-calculator \
  --restart unless-stopped \
  -p 9999:9999 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/backups:/app/backups \
  env-calculator
```

## 镜像发布

仓库已配置 GitHub Actions：
- push 到 `main` 会自动构建并推送 `ghcr.io/z584644116/env-calculator:latest`
- 打 tag 也会生成对应版本标签

## 运维命令

```bash
docker ps
docker logs -f env-calculator
curl http://127.0.0.1:9999/api/health
ss -lntp | grep 9999
```

## 许可证

MIT License
