const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let loc = res.headers.location;
        if (loc.startsWith('/')) {
          const u = new URL(url);
          loc = u.origin + loc;
        }
        console.log(url, '-> redirecting to ->', loc);
        return resolve(fetchUrl(loc));
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    }).on('error', reject);
  });
}

async function run() {
  console.log('Fetching everlasting.shop/pages/home ...');
  const res = await fetchUrl('https://www.everlasting.shop/pages/home');
  console.log('Status:', res.status);
  console.log('Body length:', res.body.length);

  // Check what platform it's built on: Shopify, WooCommerce, Custom?
  const isShopify = res.body.includes('Shopify.shop') || res.body.includes('cdn.shopify.com');
  console.log('Is Shopify?:', isShopify);

  // Find all script tags
  const scriptRegex = /<script[^>]*src=["']([^"']+)["'][^>]*>/gi;
  let m;
  const scripts = [];
  while ((m = scriptRegex.exec(res.body)) !== null) {
    scripts.push(m[1]);
  }
  console.log(`Found ${scripts.length} external scripts.`);
  
  const fastrrScripts = scripts.filter(s => /fastrr|shiprocket|pickrr|gokwik|kodo|checkout/i.test(s));
  console.log('Fastrr / Checkout scripts found:');
  console.log(fastrrScripts);

  // Check inline scripts for checkout configuration
  const inlineScripts = [...res.body.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
  console.log(`Found ${inlineScripts.length} inline scripts.`);

  inlineScripts.forEach((s, idx) => {
    if (/fastrr|shiprocket|checkoutBuyer|HeadlessCheckout|GoKwik/i.test(s)) {
      console.log(`\nInline script #${idx} mentions checkout:`);
      console.log(s.substring(0, 500));
    }
  });

  // Check for checkout button or form
  const checkoutButtons = [...res.body.matchAll(/<button[^>]*class=["'][^"']*(?:checkout|buy|fastrr)[^"']*["'][^>]*>([\s\S]*?)<\/button>/gi)].map(m => m[0]);
  console.log('\nCheckout buttons found:', checkoutButtons.slice(0, 5));
}

run();
