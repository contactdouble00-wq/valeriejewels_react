const https = require('https');
const apiKey = 'H9OqAyD42nNdEujibGBXKQYIxTVlSm8s5Pcf7ztra0WMh13RL6lZ7BbiERJ8owgrnkyWdDUmhP6qGNtf';

function testOtpSend(body) {
  return new Promise(resolve => {
    const payload = JSON.stringify(body);
    const req = https.request({
      hostname: 'www.fast2sms.com',
      path: '/dev/otp/send',
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
        console.log(`[POST /dev/otp/send ${JSON.stringify(body)}] Status: ${res.statusCode} -> ${d}`);
        resolve();
      });
    });
    req.on('error', e => { console.log(`Error: ${e.message}`); resolve(); });
    req.write(payload);
    req.end();
  });
}

async function run() {
  await testOtpSend({ mobile: '9023422392' });
  await testOtpSend({ mobile: '9023422392', otp_id: 'default' });
  await testOtpSend({ mobile: '9023422392', otp_id: '1' });
  await testOtpSend({ mobile: '9023422392', otp_id: '0' });
  await testOtpSend({ mobile: '9023422392', otp_id: 'valerie' });
  await testOtpSend({ mobile: '9023422392', otp_id: 'otp' });
}
run();
