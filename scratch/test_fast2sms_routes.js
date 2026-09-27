const https = require('https');
const apiKey = 'H9OqAyD42nNdEujibGBXKQYIxTVlSm8s5Pcf7ztra0WMh13RL6lZ7BbiERJ8owgrnkyWdDUmhP6qGNtf';

function testRoute(name, path, postData) {
  return new Promise(resolve => {
    const opts = {
      hostname: 'www.fast2sms.com',
      path: path,
      method: postData ? 'POST' : 'GET',
      headers: {
        'authorization': apiKey,
        ...(postData ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) } : {})
      }
    };
    const req = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        console.log(`[${name}] Status:`, res.statusCode);
        console.log(`[${name}] Body:`, d);
        resolve();
      });
    });
    if (postData) req.write(postData);
    req.end();
  });
}

async function run() {
  // Test 1: route=q (Quick transactional)
  await testRoute('route=q GET', `/dev/bulkV2?authorization=${encodeURIComponent(apiKey)}&route=q&message=${encodeURIComponent('Your Valerie Jewels verification code is 123456')}&language=english&flash=0&numbers=9876543210`);

  // Test 2: route=otp POST
  const otpPost = JSON.stringify({
    route: 'otp',
    variables_values: '123456',
    numbers: '9876543210'
  });
  await testRoute('route=otp POST', '/dev/bulkV2', otpPost);

  // Test 3: check account details / verified domains
  await testRoute('account details', '/dev/wallet');
}

run();
