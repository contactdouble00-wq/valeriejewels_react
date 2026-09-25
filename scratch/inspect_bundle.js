const https = require('https');
https.get('https://fastrr-boost-ui.pickrr.com/static/js/main.6f1db82ad8d7bfb4c20e.js', res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    let re = /customerTokenCalled/g;
    let m;
    while ((m = re.exec(data)) !== null) {
      console.log('Match at ' + m.index + ': ' + data.substring(m.index - 50, m.index + 120));
    }
  });
});
