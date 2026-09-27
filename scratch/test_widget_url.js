const https = require('https');

function post(url, data) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve(JSON.parse(body)));
    });
    req.on('error', reject);
    req.write(JSON.stringify(data));
    req.end();
  });
}

async function run() {
  const sess = await post('https://valeriejewels.in/api/fastrr/create_session.php', {
    items: [{ id: 20, name: '12-Pair Multicolor Oxidized Earrings Set', price: 799, quantity: 1 }]
  });
  console.log('Session result:', sess);
  const token = sess.data.token;

  const channelObj = {
    shop_name: 'company-logo',
    shop_url: 'valeriejewels.in',
    redirectUrl: 'https://valeriejewels.in/',
    credInstalled: false,
    gpayInstalled: 'NO'
  };
  const channelB64 = Buffer.from(encodeURIComponent(JSON.stringify(channelObj))).toString('base64');
  const cartB64 = Buffer.from(encodeURIComponent(JSON.stringify([]))).toString('base64');

  const params = new URLSearchParams({
    customCheckoutToken: token,
    type: 'cart',
    platform: 'CUSTOM',
    channel: channelB64,
    'seller-domain': 'valeriejewels.in',
    userDeviceId: 'test-device-uuid',
    userSessionId: 'test-session-uuid',
    uuid: 'test-uuid'
  });

  const fullWidgetUrl = 'https://fastrr-boost-ui.pickrr.com/?' + params.toString() + '#cart=' + cartB64;
  console.log('\nGenerated Fastrr Widget URL:\n', fullWidgetUrl);
}

run();
