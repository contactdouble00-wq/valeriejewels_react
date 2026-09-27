const https = require('https');

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function run() {
  const js = await fetch('https://fastrr-boost-ui.pickrr.com/assets/js/channels/shopify.js');
  console.log(js.substring(38500, 40130));
}

run();
