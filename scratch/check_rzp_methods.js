const https = require('https');

const key = 'rzp_live_Tf7Bar4fWloC2y';
const secret = 'u8xu0HfY01b0wkwWwiYfEBRN';
const auth = Buffer.from(`${key}:${secret}`).toString('base64');

const options = {
  hostname: 'api.razorpay.com',
  path: '/v1/methods',
  method: 'GET',
  headers: {
    'Authorization': `Basic ${auth}`
  }
};

const req = https.request(options, res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    try {
      const json = JSON.parse(body);
      console.log('Payment Methods:', JSON.stringify(json, null, 2));
    } catch(e) {
      console.log('Raw body:', body);
    }
  });
});

req.on('error', err => console.error(err));
req.end();
