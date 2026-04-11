# 环境计算器 (Environment Calculator)

专业的环境监测计算工具，支持采样嘴计算等功能。基于 Next.js 构建，当前版本支持本地开发、GHCR 镜像发布和 Linux 服务器 Docker 部署。

## 安全部署原则

生产环境默认只允许 `nginx` 本机反向代理访问容器，**不要**把 `9999` 端口直接暴露到公网。

推荐部署方式：
- Docker 容器仅绑定 `127.0.0.1:9999`
- 外网访问统一走 `nginx`
- 整站启用 Basic Auth
- `/api/health` 可按需放行给监控

## Linux 服务器部署

### 推荐方式：直接拉 GHCR 镜像

```bash
mkdir -p ~/env-calculator/data ~/env-calculator/backups
cd ~/env-calculator

docker pull ghcr.io/z584644116/env-calculator:latest

docker rm -f env-calculator 2>/dev/null || true

docker run -d \
  --name env-calculator \
  --restart unless-stopped \
  -p 127.0.0.1:9999:9999 \
  -v ~/env-calculator/data:/app/data \
  -v ~/env-calculator/backups:/app/backups \
  ghcr.io/z584644116/env-calculator:latest
```

这样外网不能直接访问 `服务器IP:9999`，只能通过 nginx 访问。

### nginx 安全接入示例

先安装生成密码文件工具：

```bash
yum install -y httpd-tools 2>/dev/null || apt install -y apache2-utils 2>/dev/null
htpasswd -bc /etc/nginx/.htpasswd admin your-password
```

然后配置 nginx：

```nginx
server {
    server_name zyfpeak.asia;

    client_max_body_size 100M;

    auth_basic "Restricted Access";
    auth_basic_user_file /etc/nginx/.htpasswd;

    location / {
        proxy_pass http://127.0.0.1:9999;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }

    location /api/health {
        auth_basic off;
        proxy_pass http://127.0.0.1:9999;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/zyfpeak.asia/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/zyfpeak.asia/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    if ($host = zyfpeak.asia) {
        return 301 https://$host$request_uri;
    }
    server_name zyfpeak.asia;
    listen 80;
    return 404;
}
```

### 验证

```bash
nginx -t
nginx -s reload
curl http://127.0.0.1:9999/api/health
curl --connect-timeout 3 http://你的服务器IP:9999/
```

预期：
- `127.0.0.1:9999` 可访问
- `服务器IP:9999` 外网不可直接访问或超时
- 通过域名可以访问应用

## 许可证

MIT License
