const https = require('https');

https.get('https://checkout-ui.shiprocket.com/assets/js/channels/shopify.js', res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    // Find where y is initialized
    let idx = 0;
    while ((idx = data.indexOf('URLSearchParams', idx)) !== -1) {
      console.log('URLSearchParams at', idx, data.substring(idx - 100, idx + 100));
      idx += 15;
    }
  });
});
