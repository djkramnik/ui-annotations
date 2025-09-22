type RasterSize = { width: number; height: number } | null;

function readUInt16BE(arr: Uint8Array, offset: number): number {
  return (arr[offset] << 8) | arr[offset + 1];
}

function readUInt32BE(arr: Uint8Array, offset: number): number {
  // DataView handles unaligned reads safely
  return new DataView(arr.buffer, arr.byteOffset, arr.byteLength).getUint32(offset, false);
}

export function pngSize(arr: Uint8Array): RasterSize {
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  if (
    arr.length >= 24 &&
    arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4e && arr[3] === 0x47 &&
    arr[4] === 0x0d && arr[5] === 0x0a && arr[6] === 0x1a && arr[7] === 0x0a
  ) {
    const w = readUInt32BE(arr, 16);
    const h = readUInt32BE(arr, 20);
    return { width: w, height: h };
  }
  return null;
}

export function jpegSize(arr: Uint8Array): RasterSize {
  // Minimal JPEG parser: scan markers until a SOF (start of frame) with size info
  if (arr.length < 4 || arr[0] !== 0xff || arr[1] !== 0xd8) return null; // not a JPEG

  // SOF markers that carry dimensions (exclude DHT/DQT/APP/etc.)
  const isSOF = (m: number) =>
    (m >= 0xc0 && m <= 0xc3) ||
    (m >= 0xc5 && m <= 0xc7) ||
    (m >= 0xc9 && m <= 0xcb) ||
    (m >= 0xcd && m <= 0xcf);

  let i = 2; // start after SOI (FF D8)
  while (i + 3 < arr.length) {
    // Seek next marker 0xFF
    while (i < arr.length && arr[i] !== 0xff) i++;
    if (i + 3 >= arr.length) break;

    // Skip fill bytes (FF FF ...)
    while (i < arr.length && arr[i] === 0xff) i++;
    if (i >= arr.length) break;

    const marker = arr[i];
    i++;

    // Standalone markers without length (e.g., EOI, RSTn)
    if (marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      continue;
    }

    if (i + 1 >= arr.length) break;
    const segLen = readUInt16BE(arr, i); // includes the 2 bytes of segLen itself
    if (segLen < 2 || i + segLen > arr.length) break;

    if (isSOF(marker)) {
      // SOF segment layout: [len_hi len_lo] [precision] [height_hi height_lo] [width_hi width_lo] ...
      if (segLen >= 7) {
        const precision = arr[i + 2]; // unused, usually 8
        const h = readUInt16BE(arr, i + 3);
        const w = readUInt16BE(arr, i + 5);
        if (w > 0 && h > 0) return { width: w, height: h };
      }
      return null; // malformed SOF
    }

    i += segLen; // jump to next marker
  }

  return null; // no SOF found
}

export function getRasterSize(arr: Uint8Array): RasterSize {
  return pngSize(arr) ?? jpegSize(arr);
}

/* =========================
   Simple image type detection
   ========================= */
export function detectImageExt(buf: Buffer): 'png' | 'jpg' | 'gif' | 'bin' {
  if (buf.length >= 8) {
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47 &&
      buf[4] === 0x0d &&
      buf[5] === 0x0a &&
      buf[6] === 0x1a &&
      buf[7] === 0x0a
    ) {
      return 'png';
    }
  }
  if (buf.length >= 3) {
    // JPG: FF D8 FF
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  }
  if (buf.length >= 2) {
    // GIF: 47 49
    if (buf[0] === 0x47 && buf[1] === 0x49) return 'gif';
  }
  return 'bin';
}