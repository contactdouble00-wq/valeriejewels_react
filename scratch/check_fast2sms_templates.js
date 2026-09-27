const https = require('https');
const apiKey = 'H9OqAyD42nNdEujibGBXKQYIxTVlSm8s5Pcf7ztra0WMh13RL6lZ7BbiERJ8owgrnkyWdDUmhP6qGNtf';

function get(path) {
  return new Promise(resolve => {
    https.get({
      hostname: 'www.fast2sms.com',
      path: path,
      headers: {
        'authorization': apiKey,
        'accept': 'application/json'
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        console.log(`[GET ${path}] Status:`, res.statusCode);
        console.log(`[GET ${path}] Response:`, d);
        resolve();
      });
    });
  });
}

async function run() {
  await get('/dev/otp/templates');
  await get('/dev/dlt/template');
  await get('/dev/dlt/templates');
}
run();
