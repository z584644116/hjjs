import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ClawCloud Run 优化配置
  output: 'standalone',

  // 服务器外部依赖（替代 experimental.serverComponentsExternalPackages）
  serverExternalPackages: ['fs', 'path'],

  // 环境变量配置
  env: {
    CLAW_CLOUD_RUN: process.env.CLAW_CLOUD_RUN || 'false',
    CLAW_STORAGE_PATH: process.env.CLAW_STORAGE_PATH || '/tmp/data',
    CLAW_BACKUP_PATH: process.env.CLAW_BACKUP_PATH || '/tmp/backups',
  },

  // 静态资源优化
  images: {
    unoptimized: true,
  },


  // 重定向配置
  async redirects() {
    return [
      {
        source: '/health',
        destination: '/api/health',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
