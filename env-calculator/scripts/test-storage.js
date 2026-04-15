#!/usr/bin/env node

// 存储安全测试脚本
const http = require('http');

const BASE_URL = process.env.TEST_URL || 'http://localhost:9999';
const STORAGE_API_TOKEN = process.env.STORAGE_API_TOKEN || '';

function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (_error) {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function testHealthCheck() {
  console.log('🔍 Testing health check...');
  try {
    const response = await makeRequest('GET', '/api/health');
    if (response.status === 200) {
      console.log('✅ Health check passed');
      return true;
    }

    console.log('❌ Health check failed:', response.status);
    return false;
  } catch (error) {
    console.log('❌ Health check error:', error.message);
    return false;
  }
}

async function testAnonymousStorageBlocked() {
  console.log('\n🔍 Testing anonymous storage access is blocked...');

  try {
    const response = await makeRequest('GET', '/api/storage?key=test&userId=test');
    if ([401, 404, 503].includes(response.status)) {
      console.log(`✅ Anonymous storage access blocked (${response.status})`);
      return true;
    }

    console.log(`❌ Anonymous storage access unexpectedly allowed (${response.status})`);
    return false;
  } catch (error) {
    console.log('❌ Anonymous storage block test error:', error.message);
    return false;
  }
}

async function testAuthorizedStorageOperations() {
  console.log('\n🔍 Testing authorized storage operations...');

  if (!STORAGE_API_TOKEN) {
    console.log('ℹ️ STORAGE_API_TOKEN not set, skipping authorized storage tests');
    return true;
  }

  const headers = {
    'x-storage-api-token': STORAGE_API_TOKEN,
  };

  const testData = {
    key: `test_key_${Date.now()}`,
    value: { test: true, timestamp: new Date().toISOString() },
    userId: 'test_user'
  };

  try {
    const setResponse = await makeRequest('POST', '/api/storage', testData, headers);
    if (setResponse.status !== 200) {
      throw new Error(`SET failed: ${setResponse.status}`);
    }
    console.log('✅ Authorized SET operation successful');

    const getResponse = await makeRequest('GET', `/api/storage?key=${testData.key}&userId=${testData.userId}`, null, headers);
    if (getResponse.status !== 200) {
      throw new Error(`GET failed: ${getResponse.status}`);
    }
    if (JSON.stringify(getResponse.data.value) !== JSON.stringify(testData.value)) {
      throw new Error('GET returned incorrect value');
    }
    console.log('✅ Authorized GET operation successful');

    const deleteResponse = await makeRequest('DELETE', `/api/storage?key=${testData.key}&userId=${testData.userId}`, null, headers);
    if (deleteResponse.status !== 200) {
      throw new Error(`DELETE failed: ${deleteResponse.status}`);
    }
    console.log('✅ Authorized DELETE operation successful');

    return true;
  } catch (error) {
    console.log('❌ Authorized storage test failed:', error.message);
    return false;
  }
}

async function testMainPageSecurityHeaders() {
  console.log('\n🔍 Testing main page security headers...');
  try {
    const response = await makeRequest('GET', '/');
    const hasCsp = Boolean(response.headers['content-security-policy']);
    const hasNoSniff = response.headers['x-content-type-options'] === 'nosniff';

    if (response.status === 200 && hasCsp && hasNoSniff) {
      console.log('✅ Main page security headers present');
      return true;
    }

    console.log('❌ Main page security headers missing or invalid');
    return false;
  } catch (error) {
    console.log('❌ Main page security header test error:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting storage security tests...\n');
  console.log(`🎯 Target URL: ${BASE_URL}\n`);

  const results = {
    health: false,
    anonymousStorageBlocked: false,
    authorizedStorage: false,
    mainPageHeaders: false,
  };

  results.health = await testHealthCheck();
  results.anonymousStorageBlocked = await testAnonymousStorageBlocked();
  results.authorizedStorage = await testAuthorizedStorageOperations();
  results.mainPageHeaders = await testMainPageSecurityHeaders();

  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  console.log(`Health Check: ${results.health ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Anonymous Storage Blocked: ${results.anonymousStorageBlocked ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Authorized Storage Operations: ${results.authorizedStorage ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Main Page Security Headers: ${results.mainPageHeaders ? '✅ PASS' : '❌ FAIL'}`);

  const allPassed = Object.values(results).every(Boolean);
  console.log(`\nOverall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

  if (!allPassed) {
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = {
  testHealthCheck,
  testAnonymousStorageBlocked,
  testAuthorizedStorageOperations,
  testMainPageSecurityHeaders,
};