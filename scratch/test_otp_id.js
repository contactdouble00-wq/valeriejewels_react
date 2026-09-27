const https = require('https');
const apiKey = 'H9OqAyD42nNdEujibGBXKQYIxTVlSm8s5Pcf7ztra0WMh13RL6lZ7BbiERJ8owgrnkyWdDUmhP6qGNtf';

function testOtp(otpId) {
  return new Promise(resolve => {
    const postData = JSON.stringify({
      mobile: '9023422392',
      otp_id: otpId,
      otp_length: 6
    });
    const req = https.request({
      hostname: 'www.fast2sms.com',
      path: '/dev/otp/send',
      method: 'POST',
      headers: {
        'authorization': apiKey,
        'accept': 'application/json',
        'content-type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        console.log(`[otp_id: "${otpId}"] Status:`, res.statusCode);
        console.log(`[otp_id: "${otpId}"] Response:`, d);
        resolve();
      });
    });
    req.write(postData);
    req.end();
  });
}

async function run() {
  await testOtp('1');
  await testOtp('default');
}
run();
