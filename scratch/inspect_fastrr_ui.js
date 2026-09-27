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
  const js1 = await fetch('https://fastrr-boost-ui.pickrr.com/static/js/main.6f1db82ad8d7bfb4c20e.js');
  let pos = js1.toLowerCase().indexOf('something went wrong');
  console.log('main.js pos:', pos);
  if (pos !== -1) {
    console.log(js1.substring(pos - 200, pos + 300));
  }
  const js2 = await fetch('https://fastrr-boost-ui.pickrr.com/static/js/nodeModules.d6d161d49cc20c522e65.js');
  pos = js2.toLowerCase().indexOf('something went wrong');
  console.log('nodeModules.js pos:', pos);
  if (pos !== -1) {
    console.log(js2.substring(pos - 200, pos + 300));
  }
}

run();
