#!/usr/bin/env node

// 部署状态检查脚本
const https = require('https');
const http = require('http');

const DEFAULT_URLS = [
  'http://localhost:3000',
  'https://env-calculator.clawcloud.run',
  'https://your-custom-domain.com'
];

function makeRequest(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      timeout: timeout,
      headers: {
        'User-Agent': 'ClawCloud-Deployment-Checker/1.0'
      }
    };

    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: body,
          url: url
        });
      });
    });

    req.on('error', (error) => {
      reject({ error: error.message, url: url });
    });

    req.on('timeout', () => {
      req.destroy();
      reject({ error: 'Request timeout', url: url });
    });

    req.end();
  });
}

async function checkEndpoint(url, endpoint = '') {
  const fullUrl = url + endpoint;
  console.log(`🔍 Checking: ${fullUrl}`);
  
  try {
    const response = await makeRequest(fullUrl);
    
    if (response.status >= 200 && response.status < 300) {
      console.log(`✅ ${fullUrl} - Status: ${response.status}`);
      return { success: true, status: response.status, url: fullUrl };
    } else {
      console.log(`⚠️ ${fullUrl} - Status: ${response.status}`);
      return { success: false, status: response.status, url: fullUrl };
    }
  } catch (error) {
    console.log(`❌ ${fullUrl} - Error: ${error.error}`);
    return { success: false, error: error.error, url: fullUrl };
  }
}

async function checkHealth(url) {
  console.log(`\n🏥 Health Check: ${url}`);
  
  const endpoints = [
    { path: '/api/health', name: 'Health API' },
    { path: '/api/storage?key=test&userId=test', name: 'Storage API' },
    { path: '/', name: 'Main Page' }
  ];

  const results = [];
  
  for (const endpoint of endpoints) {
    console.log(`  📋 Testing ${endpoint.name}...`);
    const result = await checkEndpoint(url, endpoint.path);
    results.push({ ...result, name: endpoint.name });
  }

  return results;
}

async function checkDeploymentStatus() {
  console.log('🚀 ClawCloud Run Deployment Status Check\n');
  console.log('=' .repeat(50));

  const urls = process.argv.slice(2);
  const targetUrls = urls.length > 0 ? urls : DEFAULT_URLS;

  const allResults = [];

  for (const url of targetUrls) {
    console.log(`\n🌐 Checking deployment: ${url}`);
    console.log('-'.repeat(30));
    
    const results = await checkHealth(url);
    allResults.push({ url, results });
  }

  // 汇总报告
  console.log('\n📊 Deployment Status Summary');
  console.log('=' .repeat(50));

  let totalChecks = 0;
  let successfulChecks = 0;

  for (const deployment of allResults) {
    console.log(`\n🌐 ${deployment.url}:`);
    
    for (const result of deployment.results) {
      totalChecks++;
      if (result.success) {
        successfulChecks++;
        console.log(`  ✅ ${result.name}: OK (${result.status})`);
      } else {
        console.log(`  ❌ ${result.name}: FAILED (${result.status || result.error})`);
      }
    }
  }

  const successRate = Math.round((successfulChecks / totalChecks) * 100);
  console.log(`\n📈 Overall Success Rate: ${successfulChecks}/${totalChecks} (${successRate}%)`);

  if (successRate >= 80) {
    console.log('🎉 Deployment appears to be healthy!');
    process.exit(0);
  } else if (successRate >= 50) {
    console.log('⚠️ Deployment has some issues but is partially functional.');
    process.exit(1);
  } else {
    console.log('🚨 Deployment appears to have significant issues.');
    process.exit(2);
  }
}

function showHelp() {
  console.log(`
ClawCloud Run Deployment Status Checker

Usage:
  node scripts/check-deployment.js [URL1] [URL2] ...

Examples:
  node scripts/check-deployment.js
  node scripts/check-deployment.js http://localhost:3000
  node scripts/check-deployment.js https://your-app.clawcloud.run
  node scripts/check-deployment.js http://localhost:3000 https://your-app.clawcloud.run

Default URLs checked:
  - http://localhost:3000
  - https://env-calculator.clawcloud.run
  - https://your-custom-domain.com

Exit codes:
  0 - Success rate >= 80%
  1 - Success rate >= 50%
  2 - Success rate < 50%
`);
}

// 处理命令行参数
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showHelp();
  process.exit(0);
}

// 运行检查
checkDeploymentStatus().catch(error => {
  console.error('❌ Deployment check failed:', error);
  process.exit(3);
});
