# Linux 服务器部署说明

当前版本默认端口为 `9999`，推荐优先使用 GHCR 镜像部署。

## 1. 服务器准备

确保服务器已安装：
- docker

检查命令：

```bash
docker --version
```

## 2. 推荐部署：直接拉镜像

```bash
mkdir -p ~/env-calculator/data ~/env-calculator/backups
cd ~/env-calculator

docker pull ghcr.io/z584644116/env-calculator:latest

docker rm -f env-calculator 2>/dev/null || true

docker run -d \
  --name env-calculator \
  --restart unless-stopped \
  -p 9999:9999 \
  -v ~/env-calculator/data:/app/data \
  -v ~/env-calculator/backups:/app/backups \
  ghcr.io/z584644116/env-calculator:latest
```

## 3. 验证

```bash
docker ps
curl http://127.0.0.1:9999/api/health
```

## 4. 更新版本

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

## 5. 备用方案：本地构建

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

## 6. 常见问题

### 拉不到镜像

确认：
- GitHub Actions 已经成功执行过 build workflow
- GHCR 包是公开的，或服务器已 `docker login ghcr.io`

### 端口占用

```bash
ss -lntp | grep 9999
```

### 容器未启动成功

```bash
docker logs env-calculator --tail 200
```
