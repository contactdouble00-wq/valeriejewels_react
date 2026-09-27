const fs = require('fs');
const js = fs.readFileSync('scratch/fastrr_main.js', 'utf8');

const pos = 347299;
// Let's find where 'de' is referenced after pos
let searchPos = pos + 70;
while (true) {
  let idx = js.indexOf('de', searchPos);
  if (idx === -1 || idx > pos + 50000) break;
  // check word boundary
  let prev = js[idx - 1];
  let next = js[idx + 2];
  if (!/[a-zA-Z0-9_$]/.test(prev) && !/[a-zA-Z0-9_$]/.test(next)) {
    console.log('de used at', idx, ':', js.substring(Math.max(0, idx - 40), Math.min(js.length, idx + 80)));
  }
  searchPos = idx + 2;
}
