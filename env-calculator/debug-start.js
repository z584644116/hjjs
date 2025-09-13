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
    return exists;
  } catch (e) {
    console.log(`  ${filePath}: 检查失败 - ${e.message}`);
    return false;
  }
};

checkFile('package.json');
checkFile('.next');
checkFile('.next/standalone');
checkFile('.next/standalone/server.js');
checkFile('server.js');

// 检查端口
const port = process.env.PORT || 3000;
console.log(`\n=== 启动 Next.js 服务器 (端口 ${port}) ===`);

try {
  // 启动 Next.js
  require('next/dist/server/next-start').default();
} catch (error) {
  console.error('启动失败:', error);
  process.exit(1);
}
