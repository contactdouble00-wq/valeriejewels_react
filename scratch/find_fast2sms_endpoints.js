const https = require('https');
const apiKey = 'H9OqAyD42nNdEujibGBXKQYIxTVlSm8s5Pcf7ztra0WMh13RL6lZ7BbiERJ8owgrnkyWdDUmhP6qGNtf';

const paths = [
  '/dev/otp',
  '/dev/otp/template',
  '/dev/otp/list',
  '/dev/templates',
  '/dev/otp_templates',
  '/dev/smart_otp',
  '/dev/smart-otp',
  '/dev/smart_otp/templates',
  '/dev/otp/config',
  '/dev/dlt/templates',
  '/dev/dlt_templates',
  '/dev/sender_id',
  '/dev/entity'
];

async function check(path) {
  return new Promise(resolve => {
    const req = https.request({
      hostname: 'www.fast2sms.com',
      path: path,
      method: 'GET',
      headers: {
        'authorization': apiKey,
        'accept': 'application/json'
      }
    }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => {
        if (res.statusCode !== 404) {
          console.log(`[FOUND ${path}] Status: ${res.statusCode} -> ${d}`);
        } else {
          // console.log(`[404] ${path}`);
        }
        resolve();
      });
    });
    req.on('error', () => resolve());
    req.end();
  });
}

async function main() {
  for (const p of paths) {
    await check(p);
  }
}
main();
