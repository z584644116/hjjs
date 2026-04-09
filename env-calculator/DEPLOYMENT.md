# Linux 服务器部署说明

当前仓库这一版使用单个 Docker 容器部署，默认对外端口为 `9999`。

## 1. 服务器准备

确保服务器已安装：
- git
- docker

检查命令：

```bash
git --version
docker --version
```

## 2. 拉取代码

```bash
git clone https://github.com/z584644116/hjjs.git
cd hjjs/env-calculator
```

## 3. 构建镜像

```bash
docker build -t env-calculator .
```

## 4. 准备持久化目录

```bash
mkdir -p data backups
```

## 5. 启动容器

```bash
docker run -d \
  --name env-calculator \
  --restart unless-stopped \
  -p 9999:9999 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/backups:/app/backups \
  env-calculator
```

## 6. 验证

```bash
docker ps
curl http://127.0.0.1:9999/api/health
```

## 7. 更新版本

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

## 8. 反向代理（可选）

如果你有 Nginx，可把域名转发到：
- `http://127.0.0.1:9999`

## 9. 常见问题

### 端口已占用

```bash
ss -lntp | grep 9999
```

### 容器未启动成功

```bash
docker logs env-calculator --tail 200
```

### 删除旧容器重启

```bash
docker rm -f env-calculator
```
