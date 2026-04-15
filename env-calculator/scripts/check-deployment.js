#!/usr/bin/env node

// 部署状态检查脚本
const https = require('https');
const http = require('http');

const DEFAULT_URLS = [
  'http://localhost:9999',
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
      timeout,
      headers: {
        'User-Agent': 'Env-Calculator-Security-Checker/1.0'
      }
    };

    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body,
          url,
        });
      });
    });

    req.on('error', (error) => {
      reject({ error: error.message, url });
    });

    req.on('timeout', () => {
      req.destroy();
      reject({ error: 'Request timeout', url });
    });

    req.end();
  });
}

async function checkEndpoint(url, endpoint, expectedStatuses, validate) {
  const fullUrl = url + endpoint;
  console.log(`🔍 Checking: ${fullUrl}`);

  try {
    const response = await makeRequest(fullUrl);
    const passedStatus = expectedStatuses.includes(response.status);
    const passedValidation = validate ? validate(response) : true;
    const success = passedStatus && passedValidation;

    if (success) {
      console.log(`✅ ${fullUrl} - Status: ${response.status}`);
    } else {
      console.log(`⚠️ ${fullUrl} - Status: ${response.status}`);
    }

    return { success, status: response.status, url: fullUrl };
  } catch (error) {
    console.log(`❌ ${fullUrl} - Error: ${error.error}`);
    return { success: false, error: error.error, url: fullUrl };
  }
}

async function checkHealth(url) {
  console.log(`\n🏥 Security Check: ${url}`);

  const endpoints = [
    {
      path: '/api/health',
      name: 'Health API',
      expectedStatuses: [200],
      validate: (response) => response.headers['x-frame-options'] === 'DENY',
    },
    {
      path: '/api/storage?key=test&userId=test',
      name: 'Storage API locked down',
      expectedStatuses: [401, 404, 503],
    },
    {
      path: '/',
      name: 'Main Page',
      expectedStatuses: [200],
      validate: (response) => response.headers['content-security-policy'] && response.headers['x-content-type-options'] === 'nosniff',
    }
  ];

  const results = [];

  for (const endpoint of endpoints) {
    console.log(`  📋 Testing ${endpoint.name}...`);
    const result = await checkEndpoint(url, endpoint.path, endpoint.expectedStatuses, endpoint.validate);
    results.push({ ...result, name: endpoint.name });
  }

  return results;
}

async function checkDeploymentStatus() {
  console.log('🚀 Env Calculator Security Status Check\n');
  console.log('='.repeat(50));

  const urls = process.argv.slice(2);
  const targetUrls = urls.length > 0 ? urls : DEFAULT_URLS;

  const allResults = [];

  for (const url of targetUrls) {
    console.log(`\n🌐 Checking deployment: ${url}`);
    console.log('-'.repeat(30));

    const results = await checkHealth(url);
    allResults.push({ url, results });
  }

  console.log('\n📊 Deployment Status Summary');
  console.log('='.repeat(50));

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

  const successRate = totalChecks === 0 ? 0 : Math.round((successfulChecks / totalChecks) * 100);
  console.log(`\n📈 Overall Success Rate: ${successfulChecks}/${totalChecks} (${successRate}%)`);

  if (successRate >= 80) {
    console.log('🎉 Deployment appears to be securely configured.');
    process.exit(0);
  } else if (successRate >= 50) {
    console.log('⚠️ Deployment is partially hardened but still has gaps.');
    process.exit(1);
  } else {
    console.log('🚨 Deployment security posture is not acceptable yet.');
    process.exit(2);
  }
}

function showHelp() {
  console.log(`
Env Calculator Deployment Security Checker

Usage:
  node scripts/check-deployment.js [URL1] [URL2] ...

Examples:
  node scripts/check-deployment.js
  node scripts/check-deployment.js http://localhost:9999
  node scripts/check-deployment.js https://your-app.clawcloud.run

Default URLs checked:
  - http://localhost:9999
  - https://env-calculator.clawcloud.run
  - https://your-custom-domain.com

Checks:
  - /api/health is reachable
  - /api/storage is not anonymously usable
  - security headers are present on the main app
`);
}

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showHelp();
  process.exit(0);
}

checkDeploymentStatus().catch(error => {
  console.error('❌ Deployment check failed:', error);
  process.exit(3);
});