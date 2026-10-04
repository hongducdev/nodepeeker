import { describe, it, expect } from 'vitest';
import { createStoreZip, computeCrc32 } from '../src/utils/zip';

describe('Zip Builder (Store-only method 0)', () => {
  it('computes correct CRC-32 for known strings', () => {
    const encoder = new TextEncoder();
    expect(computeCrc32(encoder.encode('123456789'))).toBe(0xcbf43926);
    expect(computeCrc32(new Uint8Array([]))).toBe(0);
  });

  it('creates valid zip archive containing multiple files', () => {
    const entries = [
      { name: 'icon.png', data: new Uint8Array([1, 2, 3, 4]) },
      { name: 'icon@2x.png', data: new Uint8Array([5, 6, 7, 8]) },
      { name: 'Contents.json', data: '{"version": 1}' },
    ];

    const zip = createStoreZip(entries);
    expect(zip).toBeInstanceOf(Uint8Array);
    expect(zip.length).toBeGreaterThan(100);

    // Check PKZip local header signature (PK\x03\x04)
    expect(zip[0]).toBe(0x50);
    expect(zip[1]).toBe(0x4b);
    expect(zip[2]).toBe(0x03);
    expect(zip[3]).toBe(0x04);

    // Convert zip to string to check filenames are stored inside
    const decoder = new TextDecoder('utf-8');
    const text = decoder.decode(zip);
    expect(text).toContain('icon.png');
    expect(text).toContain('icon@2x.png');
    expect(text).toContain('Contents.json');
    expect(text).toContain('{"version": 1}');
  });
});
