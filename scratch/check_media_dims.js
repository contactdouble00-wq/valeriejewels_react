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

const dir = 'C:\\Users\\yashp\\.gemini\\antigravity-ide\\brain\\cf942bfd-5562-48c7-bee8-229d63e435e2\\.tempmediaStorage';
const files = fs.readdirSync(dir)
  .map(f => ({ name: f, time: fs.statSync(path.join(dir, f)).mtimeMs }))
  .sort((a, b) => b.time - a.time)
  .slice(0, 5);

files.forEach(f => {
  const p = path.join(dir, f.name);
  const buf = fs.readFileSync(p);
  const dims = getImageDimensions(buf);
  console.log(`${f.name}: ${dims ? `${dims.width} x ${dims.height} px` : 'unknown'}`);
});
