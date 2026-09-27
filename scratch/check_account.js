const https = require('https');
const apiKey = 'H9OqAyD42nNdEujibGBXKQYIxTVlSm8s5Pcf7ztra0WMh13RL6lZ7BbiERJ8owgrnkyWdDUmhP6qGNtf';

function check(url, method = 'GET', body = null) {
  return new Promise(resolve => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: method,
      headers: {
        'authorization': apiKey,
        'accept': 'application/json',
        ...(body ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) } : {})
      }
    }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => {
        console.log(`[${method} ${url}] Status: ${res.statusCode} -> ${d.slice(0, 300)}`);
        resolve();
      });
    });
    req.on('error', e => { console.log(`[${method} ${url}] Error: ${e.message}`); resolve(); });
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  await check('https://www.fast2sms.com/dev/wallet');
  await check('https://www.fast2sms.com/dev/dlt_manager');
  await check('https://www.fast2sms.com/dev/waba');
  await check('https://www.fast2sms.com/dev/waba/templates');
  await check('https://www.fast2sms.com/dev/phone_numbers');
}
main();
