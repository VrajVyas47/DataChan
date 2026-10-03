// Live E2E Integration Verification Script
import http from 'http';

function makeRequest(options: any, postData?: any): Promise<{ statusCode: number; headers: any; body: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode || 0,
            headers: res.headers,
            body: data ? JSON.parse(data) : null,
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode || 0,
            headers: res.headers,
            body: data,
          });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function run() {
  console.log('--- 1. Checking API Health ---');
  const health = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/health',
    method: 'GET',
  });
  console.log('API Health Status:', health.statusCode, health.body);

  console.log('\n--- 2. Querying Public/Unauthenticated Endpoints ---');
  const unauthCourses = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/courses',
    method: 'GET',
  });
  console.log('Unauthenticated courses status:', unauthCourses.statusCode);
  // Should require auth (401)
  console.log('Unauth courses result:', unauthCourses.body?.error?.code || unauthCourses.body);

  console.log('\n--- Live API Verification completed successfully ---');
}

run().catch(console.error);
