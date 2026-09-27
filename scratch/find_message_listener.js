const fs = require('fs');
const js = fs.readFileSync('scratch/shopify.js', 'utf8');

let idx = 0;
while (true) {
  let m1 = js.indexOf('message', idx);
  if (m1 === -1) break;
  let sub = js.substring(Math.max(0, m1 - 30), m1 + 40);
  if (sub.includes('addEventListener')) {
    console.log('addEventListener message found at', m1);
    console.log(js.substring(m1 - 20, m1 + 2000));
    break;
  }
  idx = m1 + 7;
}
