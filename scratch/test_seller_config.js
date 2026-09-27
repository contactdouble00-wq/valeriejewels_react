const https = require('https');

function post(url, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.write(JSON.stringify(data));
    req.end();
  });
}

function get(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'GET',
      headers: headers
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  console.log('1. Creating Fastrr session...');
  const sessRes = await post('https://valeriejewels.in/api/fastrr/create_session.php', {
    items: [{ id: 20, name: '12-Pair Multicolor Oxidized Earrings Set', price: 799, quantity: 1 }]
  });
  console.log('Session response:', sessRes.body);
  const sess = JSON.parse(sessRes.body);
  const token = sess.data.token;
  const orderId = sess.data.order_id;
  console.log('Token:', token, 'Order ID:', orderId);

  console.log('\n2. Calling SELLER_CONFIG with token and domain...');
  const cfgRes = await get('https://edge.pickrr.com/aggregator/api/ve1/aggregator-service/seller/config', {
    'seller-domain': 'valeriejewels.in',
    'origin': 'https://valeriejewels.in',
    'referer': 'https://valeriejewels.in/',
    'token': token,
    'authorization': 'Bearer ' + token
  });
  console.log('SELLER_CONFIG Status:', cfgRes.status);
  console.log('SELLER_CONFIG Body:\n', cfgRes.body);

  let sellerId = null;
  try {
    const cfgData = JSON.parse(cfgRes.body);
    sellerId = cfgData.data?.id || cfgData.data?.seller_id;
    console.log('Seller ID:', sellerId);
  } catch (e) {}

  if (sellerId) {
    console.log('\n3. Calling GET_PAYMENT_METHODS for sellerId ' + sellerId + '...');
    const payRes = await get(`https://edge.pickrr.com/pay/api/ve1/payment-aggregator/seller/config/${sellerId}/?api_version=v2`, {
      'seller-domain': 'valeriejewels.in',
      'origin': 'https://valeriejewels.in',
      'referer': 'https://valeriejewels.in/',
      'token': token
    });
    console.log('Payment Methods Status:', payRes.status);
    console.log('Payment Methods Body:\n', payRes.body);
  }
}

run();
