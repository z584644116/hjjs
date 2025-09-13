#!/usr/bin/env node

// 本地开发环境存储设置脚本
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const BACKUP_DIR = path.join(__dirname, '..', 'backups');

function createDirectory(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  } else {
    console.log(`📁 Directory already exists: ${dir}`);
  }
}

function createEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.local');
  const examplePath = path.join(__dirname, '..', '.env.example');
  
  if (!fs.existsSync(envPath)) {
    if (fs.existsSync(examplePath)) {
      fs.copyFileSync(examplePath, envPath);
      console.log('✅ Created .env.local from .env.example');
    } else {
      const defaultEnv = `# 本地开发环境配置
NODE_ENV=development
CLAW_CLOUD_RUN=false
LOCAL_STORAGE_PATH=./data
LOCAL_BACKUP_PATH=./backups
PORT=3000
`;
      fs.writeFileSync(envPath, defaultEnv);
      console.log('✅ Created default .env.local');
    }
  } else {
    console.log('📄 .env.local already exists');
  }
}

function createGitignore() {
  const gitignorePath = path.join(__dirname, '..', '.gitignore');
  const storageIgnores = `
# Local storage directories
/data/
/backups/
.env.local
`;

  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, 'utf-8');
    if (!content.includes('/data/')) {
      fs.appendFileSync(gitignorePath, storageIgnores);
      console.log('✅ Updated .gitignore with storage directories');
    } else {
      console.log('📄 .gitignore already configured');
    }
  } else {
    fs.writeFileSync(gitignorePath, storageIgnores);
    console.log('✅ Created .gitignore with storage directories');
  }
}

function main() {
  console.log('🚀 Setting up local development storage...\n');
  
  try {
    createDirectory(DATA_DIR);
    createDirectory(BACKUP_DIR);
    createEnvFile();
    createGitignore();
    
    console.log('\n✅ Local storage setup completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Review and update .env.local if needed');
    console.log('2. Run: npm run dev');
    console.log('3. Test storage at: http://localhost:3000/api/health');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { createDirectory, createEnvFile, createGitignore };
