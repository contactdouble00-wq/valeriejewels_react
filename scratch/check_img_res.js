const fs = require('fs');
const path = require('path');

// Simple PNG / JPEG dimension parser without external deps
function getImageDimensions(buffer) {
  // PNG: bytes 16-24 contain width and height (4 bytes each big endian)
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return { width, height, type: 'PNG' };
  }
  // JPEG
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

const candidates = [
  'D:\\Agency stuff\\valeriejewels_react\\frontend\\public\\hero-jewelry-model.jpg',
  'D:\\Agency stuff\\valeriejewels_react\\frontend\\src\\assets\\hero.png',
  'D:\\Agency stuff\\valeriejewels_react\\valerie.png',
  'C:\\Users\\yashp\\Downloads\\WhatsApp Image 2026-09-26 at 6.37.01 PM.jpeg',
  'C:\\Users\\yashp\\Downloads\\Valerie new look\\ref1.jpg',
  'C:\\Users\\yashp\\Downloads\\Valerie new look\\ref2.jpg',
  'C:\\Users\\yashp\\Downloads\\Valerie new look\\ref3.jpg',
  'C:\\Users\\yashp\\Downloads\\WhatsApp Image 2026-09-26 at 6.41.41 PM.jpeg',
  'C:\\Users\\yashp\\Downloads\\product\\IMG_4322.jpg',
  'C:\\Users\\yashp\\Downloads\\product\\4x4.png',
  'C:\\Users\\yashp\\Downloads\\product\\2x1.png'
];

candidates.forEach(f => {
  if (fs.existsSync(f)) {
    try {
      const buf = fs.readFileSync(f);
      const dims = getImageDimensions(buf);
      console.log(`${path.basename(f)}: ${dims ? `${dims.width} x ${dims.height} px (${dims.type})` : 'unknown'}`);
    } catch (e) {
      console.log(`${path.basename(f)}: error ${e.message}`);
    }
  }
});
