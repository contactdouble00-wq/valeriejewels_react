const fs = require('fs');
const js = fs.readFileSync('scratch/shopify.js', 'utf8');

let pos = 0;
while (true) {
  let idx = js.indexOf('$e', pos);
  if (idx === -1) break;
  console.log('Occur at', idx, ':', js.substring(Math.max(0, idx - 15), idx + 40));
  pos = idx + 2;
}
