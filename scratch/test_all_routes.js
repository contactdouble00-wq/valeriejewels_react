const https = require('https');
const apiKey = 'H9OqAyD42nNdEujibGBXKQYIxTVlSm8s5Pcf7ztra0WMh13RL6lZ7BbiERJ8owgrnkyWdDUmhP6qGNtf';

function testRoute(route, extra = {}) {
  return new Promise(resolve => {
    const payload = JSON.stringify({
      route: route,
      numbers: '9023422392',
      ...extra
    });
    const req = https.request({
      hostname: 'www.fast2sms.com',
      path: '/dev/bulkV2',
      method: 'POST',
      headers: {
        'authorization': apiKey,
        'accept': 'application/json',
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(payload)
      }
    }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => {
        console.log(`[bulkV2 route=${route}] Status: ${res.statusCode} -> ${d}`);
        resolve();
      });
    });
    req.on('error', e => { console.log(`[bulkV2 route=${route}] Error: ${e.message}`); resolve(); });
    req.write(payload);
    req.end();
  });
}

async function run() {
  await testRoute('otp', { variables_values: '123456' });
  await testRoute('v3', { message: 'Your Valerie Jewels OTP is 123456' });
  await testRoute('p', { message: 'Your Valerie Jewels OTP is 123456' });
  await testRoute('t', { message: 'Your Valerie Jewels OTP is 123456' });
  await testRoute('q', { message: 'Your Valerie Jewels OTP is 123456', language: 'english' });
  await testRoute('dlt', { sender_id: 'FSTSMS', message: '123456' });
}
run();
