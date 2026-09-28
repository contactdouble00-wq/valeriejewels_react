const fs = require('fs');
const path = require('path');

function getImageDimensions(buffer) {
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return { width, height, type: 'PNG' };
  }
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xFF) break;
      const marker = buffer[offset + 1];
      if (marker === 0xC0 || marker === 0xC2) {
        const height = buffer.readUInt16BE(offset + 5);
        const width = buffer.readUInt16BE(offset + 7);
        return { width, height, type: 'JPEG' };
      }
      const len = buffer.readUInt16BE(offset + 2);
      offset += 2 + len;
    }
  }
  return null;
}

const list = [
  'D:\\Agency stuff\\valeriejewels_react\\assets\\Images\\Logo.png',
  'D:\\Agency stuff\\valeriejewels_react\\assets\\Images\\logowebiste.png',
  'D:\\Agency stuff\\valeriejewels_react\\frontend\\public\\logo.png',
  'D:\\Agency stuff\\valeriejewels_react\\frontend\\public\\valerie-logo.png',
  'D:\\Agency stuff\\valeriejewels_react\\frontend\\public\\valerie.png',
  'D:\\Agency stuff\\valeriejewels_react\\frontend\\public\\hero-jewelry-model.jpg',
  'D:\\Agency stuff\\valeriejewels_react\\frontend\\src\\assets\\hero.png'
];

list.forEach(p => {
  if (fs.existsSync(p)) {
    const buf = fs.readFileSync(p);
    const d = getImageDimensions(buf);
    console.log(`${path.basename(p)} (${p}): ${d ? `${d.width} x ${d.height} px` : 'unknown'}`);
  }
});
