# ClawCloud Run 部署指南

## 📋 概述

本应用支持通过 GitHub Actions 自动部署到 ClawCloud Run，具备完整的持久化存储和备份功能。

## 🏗️ 架构设计

### 存储架构
- **开发环境**: localStorage (浏览器) + 本地文件系统模拟
- **生产环境**: ClawCloud Run 持久化存储卷 + 自动备份
- **混合模式**: 主存储 + 降级备用存储

### 数据流
```
用户操作 → Zustand Store → 存储适配器 → ClawCloud 文件系统
                                    ↓
                              自动备份系统
```

## 🚀 部署步骤

### 1. 准备工作

#### 1.1 ClawCloud 项目设置
```bash
# 创建 ClawCloud 项目
claw projects create env-calculator

# 启用必要的 API
claw services enable run.googleapis.com
claw services enable containerregistry.googleapis.com
```

#### 1.2 GitHub Secrets 配置
在 GitHub 仓库设置中添加以下 Secrets：

```
CLAW_PROJECT_ID=your-clawcloud-project-id
CLAW_SERVICE_ACCOUNT_KEY=your-service-account-json-key-base64
CLAW_REGION=us-central1
SLACK_WEBHOOK=your-slack-webhook-url (可选)
```

### 2. 本地开发设置

#### 2.1 初始化本地环境
```bash
# 克隆仓库
git clone <your-repo-url>
cd env-calculator

# 安装依赖
npm install

# 设置本地存储
npm run setup

# 启动开发服务器
npm run dev
```

#### 2.2 测试存储功能
```bash
# 健康检查
npm run health

# 完整存储测试
npm run test:storage
```

### 3. 生产部署

#### 3.1 自动部署
推送到 `main` 或 `production` 分支将自动触发部署：

```bash
git push origin main
```

#### 3.2 手动部署
```bash
# 构建 Docker 镜像
npm run docker:build

# 推送到 ClawCloud Registry
docker tag env-calculator gcr.io/$PROJECT_ID/env-calculator
docker push gcr.io/$PROJECT_ID/env-calculator

# 部署到 ClawCloud Run
claw run deploy env-calculator \
  --image gcr.io/$PROJECT_ID/env-calculator \
  --region us-central1 \
  --set-env-vars="CLAW_CLOUD_RUN=true,NODE_ENV=production"
```

## 📁 存储配置

### 目录结构
```
/app/data/          # 主存储目录
├── anonymous/      # 匿名用户数据
├── user_123/       # 用户数据目录
│   ├── auth.json   # 认证信息
│   └── instruments.json # 仪器配置
└── ...

/app/backups/       # 备份目录
├── anonymous/
│   └── auth_2024-01-01T12-00-00.json
└── user_123/
    └── instruments_2024-01-01T12-00-00.json
```

### 存储卷配置
```yaml
# clawcloud.yml
volumes:
- name: storage-volume
  persistentVolumeClaim:
    claimName: env-calculator-storage  # 10GB
- name: backup-volume
  persistentVolumeClaim:
    claimName: env-calculator-backup   # 5GB
```

## 🔧 配置选项

### 环境变量
| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| `CLAW_CLOUD_RUN` | 启用 ClawCloud 模式 | `false` |
| `CLAW_STORAGE_PATH` | 主存储路径 | `/app/data` |
| `CLAW_BACKUP_PATH` | 备份路径 | `/app/backups` |
| `NODE_ENV` | 运行环境 | `development` |

### 资源限制
```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

## 🔍 监控和维护

### 健康检查
- **端点**: `/api/health`
- **频率**: 每 10 秒
- **超时**: 5 秒

### 日志监控
```bash
# 查看应用日志
claw logging read "resource.type=cloud_run_revision AND resource.labels.service_name=env-calculator"

# 实时日志
claw run services logs env-calculator --follow
```

### 备份管理
- **自动备份**: 每次数据写入时创建
- **保留策略**: 每个键保留最近 10 个版本
- **清理**: 自动清理过期备份

## 🚨 故障排除

### 常见问题

#### 1. 存储权限错误
```bash
# 检查存储卷挂载
kubectl describe pod <pod-name>

# 修复权限
kubectl exec -it <pod-name> -- chown -R nextjs:nodejs /app/data /app/backups
```

#### 2. 部署失败
```bash
# 检查部署状态
claw run services describe env-calculator

# 查看错误日志
claw run services logs env-calculator --limit=50
```

#### 3. 存储测试失败
```bash
# 本地测试
npm run test:storage

# 生产环境测试
TEST_URL=https://your-service-url npm run test:storage
```

### 回滚策略
```bash
# 回滚到上一个版本
claw run services update-traffic env-calculator --to-revisions=PREVIOUS=100

# 回滚到特定版本
claw run services update-traffic env-calculator --to-revisions=env-calculator-00001-abc=100
```

## 📊 性能优化

### 存储优化
- 使用 SSD 持久化磁盘 (`pd-ssd`)
- 启用区域持久化磁盘以提高可用性
- 定期清理过期备份

### 应用优化
- 启用 Next.js 静态优化
- 使用 Docker 多阶段构建
- 配置适当的资源限制

## 🔐 安全考虑

### 数据安全
- 用户数据隔离（按用户 ID 分目录）
- 文件名安全处理（防止路径遍历）
- 定期备份和恢复测试

### 访问控制
- 服务账号最小权限原则
- 网络安全组配置
- HTTPS 强制启用

## 📞 支持

如遇问题，请：
1. 查看 [GitHub Issues](https://github.com/your-repo/issues)
2. 检查部署日志
3. 运行诊断脚本：`npm run test:storage`
