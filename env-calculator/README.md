# 环境计算器 (Environment Calculator)

专业的环境监测计算工具，支持采样嘴计算等功能。基于 Next.js 构建，支持本地开发和 ClawCloud Run 部署。

## 🚀 快速开始

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

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

### 功能测试

```bash
# 健康检查
npm run health

# 存储功能测试
npm run test:storage
```

## 📁 项目结构

```
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
├── clawcloud.yml           # ClawCloud 部署配置
└── DEPLOYMENT.md           # 详细部署文档
```

## 🏗️ 架构特性

### 存储架构
- **开发环境**: localStorage (浏览器) + 本地文件系统模拟
- **生产环境**: ClawCloud Run 持久化存储卷 + 自动备份
- **混合模式**: 主存储 + 降级备用存储

### 技术栈
- **前端**: Next.js 15, React 19, TypeScript
- **UI 框架**: Fluent UI React Components
- **状态管理**: Zustand with persistence
- **部署**: ClawCloud Run with Docker
- **存储**: 文件系统 + 自动备份

## 🚀 部署

### ClawCloud Run 部署

#### 1. 环境变量配置
```bash
# 必需的环境变量
export CLAW_PROJECT_ID="your-project-id"
export CLAW_SERVICE_ACCOUNT_KEY="your-service-account-key"
export CLAW_REGION="us-central1"
```

#### 2. 使用部署脚本
```bash
# 生产环境部署
npm run deploy:production

# 预览部署（不实际执行）
npm run deploy:dry-run

# 仅构建镜像
npm run deploy:build-only
```

#### 3. GitHub Actions 自动部署
推送到 `main` 分支将自动触发部署：

```bash
git push origin main
```

需要在 GitHub 仓库设置中配置以下 Secrets：
- `CLAW_PROJECT_ID`
- `CLAW_SERVICE_ACCOUNT_KEY`
- `CLAW_REGION`
- `SLACK_WEBHOOK` (可选)

### 手动部署
```bash
# 构建 Docker 镜像
docker build -t env-calculator .

# 运行容器（本地测试）
docker run -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/backups:/app/backups \
  env-calculator
```

## 🔧 配置选项

### 环境变量

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| `NODE_ENV` | 运行环境 | `development` |
| `CLAW_CLOUD_RUN` | 启用 ClawCloud 模式 | `false` |
| `CLAW_STORAGE_PATH` | 主存储路径 | `/app/data` |
| `CLAW_BACKUP_PATH` | 备份路径 | `/app/backups` |
| `PORT` | 服务端口 | `3000` |

### 本地开发配置
复制 `.env.example` 为 `.env.local` 并根据需要修改：

```bash
cp .env.example .env.local
```

## 🔍 监控和维护

### API 端点
- **健康检查**: `/api/health`
- **存储 API**: `/api/storage`

### 日志和监控
```bash
# 查看 ClawCloud 日志
claw run services logs env-calculator --follow

# 本地健康检查
curl http://localhost:3000/api/health
```

### 备份管理
- 自动备份：每次数据写入时创建
- 保留策略：每个键保留最近 10 个版本
- 备份位置：`/app/backups/` (生产) 或 `./backups/` (开发)

## 🛠️ 开发

### 可用脚本

```bash
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run start        # 启动生产服务器
npm run lint         # 代码检查
npm run setup        # 设置本地存储环境
npm run health       # 健康检查
npm run test:storage # 存储功能测试
```

### 功能特性

#### 🔐 用户认证系统
- **访客模式**：数据保存在浏览器本地存储
- **注册登录**：支持持久化存储
- **密码重置**：基于唯一恢复密钥的安全重置机制

#### 📊 采样嘴计算
- 支持普通颗粒物和低浓度颗粒物两种采样类型
- 基于烟气流速和含湿量精确计算
- 提供满功率和保护功率两种推荐方案
- 完整的采样嘴规格库

#### 🔧 仪器管理
- 多仪器型号管理
- 支持配置最高采样流量
- 完整的增删改查功能

### 计算公式

干烟气流速计算：
```
V_d = V_w × (1 - X_w)
```

### 采样嘴规格库

- **普通颗粒物**: 4.5, 6, 7, 8, 10, 12 mm
- **低浓度颗粒物**: 4, 4.5, 5, 6, 7, 8, 10, 12, 14, 15, 16, 18, 20, 22, 24 mm

## 🚨 故障排除

### 常见问题

1. **存储权限错误**
   ```bash
   # 检查目录权限
   ls -la data/ backups/

   # 修复权限
   chmod -R 755 data/ backups/
   ```

2. **部署失败**
   ```bash
   # 检查环境变量
   echo $CLAW_PROJECT_ID

   # 查看部署日志
   npm run deploy:dry-run
   ```

3. **健康检查失败**
   ```bash
   # 本地测试
   npm run health

   # 检查服务状态
   npm run test:storage
   ```

### 获取帮助
- 查看 [DEPLOYMENT.md](./DEPLOYMENT.md) 获取详细部署指南
- 检查 [GitHub Issues](https://github.com/your-repo/issues)
- 运行诊断：`npm run test:storage`

## 📄 许可证

MIT License - 详见 [LICENSE](./LICENSE) 文件。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request
