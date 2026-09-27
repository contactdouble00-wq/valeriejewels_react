const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let loc = res.headers.location;
        if (loc.startsWith('/')) {
          const u = new URL(url);
          loc = u.origin + loc;
        }
        return resolve(fetchUrl(loc));
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    }).on('error', reject);
  });
}

async function run() {
  console.log('Fetching madewidlove.in ...');
  const res = await fetchUrl('https://madewidlove.in/');
  console.log('Status:', res.status);
  console.log('Is Shopify?:', res.body.includes('Shopify.shop') || res.body.includes('cdn.shopify.com'));

  // check scripts
  const scriptRegex = /<script[^>]*src=["']([^"']+)["'][^>]*>/gi;
  let m;
  const scripts = [];
  while ((m = scriptRegex.exec(res.body)) !== null) {
    scripts.push(m[1]);
  }
  const checkoutScripts = scripts.filter(s => /fastrr|shiprocket|pickrr|gokwik|kodo|checkout|razorpay|simpl|cashfree/i.test(s));
  console.log('Checkout scripts on madewidlove.in:');
  console.log(checkoutScripts);

  // check inline scripts
  const inlineScripts = [...res.body.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
  inlineScripts.forEach((s, idx) => {
    if (/fastrr|shiprocket|checkoutBuyer|HeadlessCheckout|gokwik/i.test(s)) {
      console.log(`\nInline script #${idx} mentions checkout:`);
      console.log(s.substring(0, 400));
    }
  });
}

run();
