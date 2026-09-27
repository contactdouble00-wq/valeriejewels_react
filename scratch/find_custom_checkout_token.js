const fs = require('fs');
const js = fs.readFileSync('scratch/fastrr_main.js', 'utf8');

const regex = /customCheckoutToken/g;
let match;
while ((match = regex.exec(js)) !== null) {
  console.log('Match at', match.index);
  console.log(js.substring(Math.max(0, match.index - 100), Math.min(js.length, match.index + 300)));
  console.log('-----------------------------------');
}
