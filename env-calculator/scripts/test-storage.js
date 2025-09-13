#!/usr/bin/env node

// 存储功能测试脚本
const http = require('http');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const data = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data });
        } catch (_error) {
          resolve({ status: res.statusCode, data: body });
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
      console.log('📊 Status:', response.data.status);
      return true;
    } else {
      console.log('❌ Health check failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Health check error:', error.message);
    return false;
  }
}

async function testStorageOperations() {
  console.log('\n🔍 Testing storage operations...');
  
  const testData = {
    key: 'test_key_' + Date.now(),
    value: JSON.stringify({ test: true, timestamp: new Date().toISOString() }),
    userId: 'test_user'
  };

  try {
    // Test SET
    console.log('📝 Testing storage SET...');
    const setResponse = await makeRequest('POST', '/api/storage', testData);
    if (setResponse.status !== 200) {
      throw new Error(`SET failed: ${setResponse.status}`);
    }
    console.log('✅ SET operation successful');

    // Test GET
    console.log('📖 Testing storage GET...');
    const getResponse = await makeRequest('GET', `/api/storage?key=${testData.key}&userId=${testData.userId}`);
    if (getResponse.status !== 200) {
      throw new Error(`GET failed: ${getResponse.status}`);
    }
    if (getResponse.data.data.value !== testData.value) {
      throw new Error('GET returned incorrect value');
    }
    console.log('✅ GET operation successful');

    // Test DELETE
    console.log('🗑️ Testing storage DELETE...');
    const deleteResponse = await makeRequest('DELETE', `/api/storage?key=${testData.key}&userId=${testData.userId}`);
    if (deleteResponse.status !== 200) {
      throw new Error(`DELETE failed: ${deleteResponse.status}`);
    }
    console.log('✅ DELETE operation successful');

    // Verify deletion
    console.log('🔍 Verifying deletion...');
    const verifyResponse = await makeRequest('GET', `/api/storage?key=${testData.key}&userId=${testData.userId}`);
    if (verifyResponse.data.data.value !== null) {
      throw new Error('Value was not deleted');
    }
    console.log('✅ Deletion verified');

    return true;
  } catch (error) {
    console.log('❌ Storage test failed:', error.message);
    return false;
  }
}

async function testMainPage() {
  console.log('\n🔍 Testing main page...');
  try {
    const response = await makeRequest('GET', '/');
    if (response.status === 200) {
      console.log('✅ Main page accessible');
      return true;
    } else {
      console.log('❌ Main page failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Main page error:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting storage functionality tests...\n');
  console.log(`🎯 Target URL: ${BASE_URL}\n`);

  const results = {
    health: false,
    storage: false,
    mainPage: false
  };

  // Run tests
  results.health = await testHealthCheck();
  results.storage = await testStorageOperations();
  results.mainPage = await testMainPage();

  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  console.log(`Health Check: ${results.health ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Storage Operations: ${results.storage ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Main Page: ${results.mainPage ? '✅ PASS' : '❌ FAIL'}`);

  const allPassed = Object.values(results).every(result => result);
  console.log(`\nOverall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

  if (!allPassed) {
    console.log('\n💡 Troubleshooting tips:');
    console.log('- Make sure the server is running: npm run dev');
    console.log('- Check if storage directories exist: npm run setup');
    console.log('- Verify environment variables in .env.local');
    process.exit(1);
  }

  console.log('\n🎉 All tests completed successfully!');
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = { testHealthCheck, testStorageOperations, testMainPage };
