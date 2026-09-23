const https = require('https');

https.get('https://valeriejewels.in/', res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Includes Fastrr script:', body.includes('shopify.js'));
    console.log('Includes checkout-ui:', body.includes('checkout-ui.shiprocket.com'));
    const idx = body.indexOf('shopify.js');
    if (idx !== -1) {
      console.log('Context:', body.substring(idx - 100, idx + 100));
    }
  });
});
