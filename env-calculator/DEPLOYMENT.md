# Linux 服务器安全部署说明

当前版本默认端口为 `9999`，但**安全默认值**应当是：
- 容器仅绑定 `127.0.0.1:9999`
- 外网流量必须经由 `nginx`
- 推荐启用 Basic Auth

## 1. 拉取镜像并仅绑定本机回环

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

## 2. 创建 Basic Auth 密码文件

```bash
yum install -y httpd-tools 2>/dev/null || apt install -y apache2-utils 2>/dev/null
htpasswd -bc /etc/nginx/.htpasswd admin your-password
```

## 3. nginx 配置

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

## 4. 重载 nginx

```bash
nginx -t
nginx -s reload
```

## 5. 验证

```bash
curl http://127.0.0.1:9999/api/health
curl --connect-timeout 3 http://你的服务器IP:9999/
curl -u admin:your-password https://zyfpeak.asia/
```

预期：
- 宿主机本地健康检查正常
- 公网不能直接绕过 nginx 打 `9999`
- 域名访问时需要 Basic Auth

## 6. 更新容器

```bash
docker pull ghcr.io/z584644116/env-calculator:latest
docker rm -f env-calculator

docker run -d \
  --name env-calculator \
  --restart unless-stopped \
  -p 127.0.0.1:9999:9999 \
  -v ~/env-calculator/data:/app/data \
  -v ~/env-calculator/backups:/app/backups \
  ghcr.io/z584644116/env-calculator:latest
```
