/**
 * Lightweight, zero-dependency store-only (method 0) ZIP builder.
 * Generates standards-compliant .zip binary (PKZip spec / RFC 1950)
 * compatible with Windows Explorer, macOS Archive Utility, and Linux unzip.
 */

export interface ZipFileEntry {
  name: string;
  data: Uint8Array | string;
}

// Precomputed CRC32 lookup table
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[i] = c >>> 0;
}

export function computeCrc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ data[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const encoder = new TextEncoder();

export function createStoreZip(entries: ZipFileEntry[]): Uint8Array {
  const localHeaders: Uint8Array[] = [];
  const centralHeaders: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const rawData =
      typeof entry.data === 'string' ? encoder.encode(entry.data) : entry.data;
    const nameBytes = encoder.encode(entry.name);
    const crc = computeCrc32(rawData);
    const size = rawData.length;

    // 1. Local file header (30 bytes + name length + data length)
    const localHeader = new Uint8Array(30 + nameBytes.length + size);
    const lv = new DataView(localHeader.buffer, localHeader.byteOffset, localHeader.byteLength);

    lv.setUint32(0, 0x04034b50, true); // signature
    lv.setUint16(4, 20, true); // version needed (2.0)
    lv.setUint16(6, 0x0800, true); // flags (UTF-8)
    lv.setUint16(8, 0, true); // compression: 0 = Store
    lv.setUint16(10, 0, true); // mod time
    lv.setUint16(12, 0, true); // mod date
    lv.setUint32(14, crc, true); // crc32
    lv.setUint32(18, size, true); // compressed size
    lv.setUint32(22, size, true); // uncompressed size
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true); // extra field length

    localHeader.set(nameBytes, 30);
    localHeader.set(rawData, 30 + nameBytes.length);
    localHeaders.push(localHeader);

    // 2. Central directory header (46 bytes + name length)
    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(centralHeader.buffer, centralHeader.byteOffset, centralHeader.byteLength);

    cv.setUint32(0, 0x02014b50, true); // signature
    cv.setUint16(4, 20, true); // version made by
    cv.setUint16(6, 20, true); // version needed
    cv.setUint16(8, 0x0800, true); // flags (UTF-8)
    cv.setUint16(10, 0, true); // compression: 0 = Store
    cv.setUint16(12, 0, true); // mod time
    cv.setUint16(14, 0, true); // mod date
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true); // extra length
    cv.setUint16(32, 0, true); // comment length
    cv.setUint16(34, 0, true); // disk start
    cv.setUint16(36, 0, true); // internal attrs
    cv.setUint32(38, 0, true); // external attrs
    cv.setUint32(42, offset, true); // relative offset of local header

    centralHeader.set(nameBytes, 46);
    centralHeaders.push(centralHeader);

    offset += localHeader.length;
  }

  // 3. Central directory size & offset
  const centralDirOffset = offset;
  let centralDirSize = 0;
  for (const ch of centralHeaders) centralDirSize += ch.length;

  // 4. End of central directory record (22 bytes)
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer, eocd.byteOffset, eocd.byteLength);

  ev.setUint32(0, 0x06054b50, true); // signature
  ev.setUint16(4, 0, true); // disk number
  ev.setUint16(6, 0, true); // disk with CD
  ev.setUint16(8, entries.length, true); // entries on disk
  ev.setUint16(10, entries.length, true); // total entries
  ev.setUint32(12, centralDirSize, true); // size of CD
  ev.setUint32(16, centralDirOffset, true); // offset of CD
  ev.setUint16(20, 0, true); // comment length

  // 5. Combine into single Uint8Array
  const totalLength = centralDirOffset + centralDirSize + eocd.length;
  const zip = new Uint8Array(totalLength);
  let pos = 0;

  for (const lh of localHeaders) {
    zip.set(lh, pos);
    pos += lh.length;
  }
  for (const ch of centralHeaders) {
    zip.set(ch, pos);
    pos += ch.length;
  }
  zip.set(eocd, pos);

  return zip;
}
