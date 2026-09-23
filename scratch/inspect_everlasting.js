const https = require('https');

https.get('https://everlasting.shop', res => {
  console.log('Status:', res.statusCode, res.headers.location);
});
