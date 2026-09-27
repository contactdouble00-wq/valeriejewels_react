const fs = require('fs');
const js = fs.readFileSync('scratch/fastrr_main.js', 'utf8');

const terms = ['aggregator-service', 'payment-aggregator', 'UPDATE_ORDER_FAILED', 'temporary unavailable', 'temporarily unavailable'];
terms.forEach(t => {
  let idx = 0;
  while (true) {
    idx = js.indexOf(t, idx);
    if (idx === -1) break;
    console.log(`Term "${t}" found at ${idx}:`);
    console.log(js.substring(Math.max(0, idx - 150), Math.min(js.length, idx + 350)));
    console.log('---------------------------------');
    idx += t.length;
  }
});
