// utils/raster.ts
export function pngSize(buf: Buffer) {
  // PNG IHDR at bytes 16..23 (big-endian)
  if (buf.length >= 24 && buf.slice(0, 8).toString('hex') === '89504e470d0a1a0a') {
    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    return { width: w, height: h };
  }
  return null;
}

// Minimal JPEG SOF parser (handles most common SOF0/SOF2)
export function jpegSize(buf: Buffer) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null; // not JPEG
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xc3) {
      const h = buf.readUInt16BE(i + 5);
      const w = buf.readUInt16BE(i + 7);
      return { width: w, height: h };
    }
    i += 2 + len;
  }
  return null;
}

export function getRasterSize(buf: Buffer) {
  return pngSize(buf) ?? jpegSize(buf) ?? null;
}
