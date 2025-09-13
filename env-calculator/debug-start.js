#!/usr/bin/env node

// 调试启动脚本 - 输出详细信息帮助排查问题
console.log('=== 环境计算器启动调试 ===');
console.log('时间:', new Date().toISOString());
console.log('Node版本:', process.version);
console.log('工作目录:', process.cwd());
console.log('环境变量:');
console.log('  NODE_ENV:', process.env.NODE_ENV);
console.log('  PORT:', process.env.PORT);
console.log('  HOSTNAME:', process.env.HOSTNAME);
console.log('  CLAW_CLOUD_RUN:', process.env.CLAW_CLOUD_RUN);

// 检查关键文件
const fs = require('fs');
const path = require('path');

console.log('\n=== 文件检查 ===');
const checkFile = (filePath) => {
  try {
    const exists = fs.existsSync(filePath);
    console.log(`  ${filePath}: ${exists ? '存在' : '不存在'}`);
    if (exists && fs.statSync(filePath).isDirectory()) {
      try {
        const files = fs.readdirSync(filePath);
        console.log(`    内容: ${files.slice(0, 5).join(', ')}${files.length > 5 ? '...' : ''}`);
      } catch (e) {
        console.log(`    无法读取目录内容: ${e.message}`);
      }
    }
    return exists;
  } catch (e) {
    console.log(`  ${filePath}: 检查失败 - ${e.message}`);
    return false;
  }
};

checkFile('package.json');
checkFile('node_modules');
checkFile('.next');
checkFile('.next/standalone');
checkFile('.next/standalone/server.js');
checkFile('server.js');

// 检查 package.json 内容
try {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  console.log('\n=== package.json 脚本 ===');
  console.log('  start:', pkg.scripts?.start);
  console.log('  build:', pkg.scripts?.build);
} catch (e) {
  console.log('无法读取 package.json:', e.message);
}

// 检查端口
const port = process.env.PORT || 3000;
console.log(`\n=== 启动 Next.js 服务器 (端口 ${port}) ===`);

// 设置错误处理
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的 Promise 拒绝:', reason);
  process.exit(1);
});

try {
  console.log('尝试启动 Next.js...');

  // 检查是否有 standalone 构建
  if (fs.existsSync('.next/standalone/server.js')) {
    console.log('使用 standalone 模式启动...');
    require('./.next/standalone/server.js');
  } else {
    console.log('使用标准模式启动...');
    const { createServer } = require('http');
    const { parse } = require('url');
    const next = require('next');

    const dev = process.env.NODE_ENV !== 'production';
    const app = next({ dev });
    const handle = app.getRequestHandler();

    app.prepare().then(() => {
      createServer((req, res) => {
        const parsedUrl = parse(req.url, true);
        handle(req, res, parsedUrl);
      }).listen(port, (err) => {
        if (err) throw err;
        console.log(`> Ready on http://localhost:${port}`);
      });
    });
  }
} catch (error) {
  console.error('启动失败:', error);
  console.error('错误堆栈:', error.stack);
  process.exit(1);
}
