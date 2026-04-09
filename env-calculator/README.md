# 环境计算器 (Environment Calculator)

专业的环境监测计算工具，支持采样嘴计算等功能。基于 Next.js 构建，当前版本支持本地开发和 Linux 服务器 Docker 部署。

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

### Linux 服务器 Docker 部署

当前版本没有 `docker-compose.yml`，建议直接用 Docker 单容器部署。

```bash
# 1. 克隆代码
git clone https://github.com/z584644116/hjjs.git
cd hjjs/env-calculator

# 2. 构建镜像
docker build -t env-calculator .

# 3. 创建持久化目录
mkdir -p data backups

# 4. 启动容器
docker run -d \
  --name env-calculator \
  --restart unless-stopped \
  -p 9999:9999 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/backups:/app/backups \
  env-calculator
```

部署完成后访问：`http://你的服务器IP:9999`

### 更新部署

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

## 功能测试

```bash
# 健康检查
npm run health

# 存储功能测试
npm run test:storage
```

## 项目结构

```text
env-calculator/
├── src/
│   ├── app/                 # Next.js App Router
│   ├── components/          # React 组件
│   ├── lib/                 # 工具库
│   │   └── storage.ts       # 统一存储适配器
│   ├── stores/              # Zustand 状态管理
│   └── types/               # TypeScript 类型定义
├── scripts/                 # 部署和工具脚本
├── data/                    # 本地存储目录
├── backups/                 # 本地备份目录
├── Dockerfile               # 容器化配置
└── DEPLOYMENT.md            # 详细部署文档
```

## 技术栈

- 前端：Next.js 15, React 19, TypeScript
- UI 框架：Fluent UI React Components
- 状态管理：Zustand with persistence
- 部署：Docker
- 存储：浏览器 localStorage + 文件系统回退

## API 端点

- 健康检查：`/api/health`
- 存储 API：`/api/storage`

## Linux 服务器运维命令

```bash
# 查看容器日志
docker logs -f env-calculator

# 查看容器状态
docker ps

# 健康检查
curl http://127.0.0.1:9999/api/health

# 重启容器
docker restart env-calculator

# 停止容器
docker stop env-calculator
```

## 故障排除

1. 端口冲突
```bash
ss -lntp | grep 9999
```

2. 容器启动失败
```bash
docker logs env-calculator --tail 200
```

3. 健康检查失败
```bash
curl http://127.0.0.1:9999/api/health
```

## 许可证

MIT License
