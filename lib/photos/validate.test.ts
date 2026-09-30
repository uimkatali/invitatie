import { describe, it, expect } from 'vitest';
import { sniffImageType, parseDimension } from './validate';

const bytes = (...values: number[]) => new Uint8Array([...values, ...new Array(16).fill(0)]);

describe('sniffImageType', () => {
  it('detects jpeg, png and webp by magic bytes', () => {
    expect(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('image/jpeg');
    expect(sniffImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe('image/png');
    const webp = new Uint8Array(16);
    webp.set([0x52, 0x49, 0x46, 0x46], 0);
    webp.set([0x57, 0x45, 0x42, 0x50], 8);
    expect(sniffImageType(webp)).toBe('image/webp');
  });

  it('rejects everything else, including svg and html', () => {
    expect(sniffImageType(new TextEncoder().encode('<svg onload="alert(1)"></svg>'))).toBeNull();
    expect(sniffImageType(new TextEncoder().encode('<html>'))).toBeNull();
    expect(sniffImageType(new Uint8Array())).toBeNull();
  });
});

describe('parseDimension', () => {
  it('accepts sane integers only', () => {
    expect(parseDimension('1200')).toBe(1200);
    expect(parseDimension('0')).toBeNull();
    expect(parseDimension('99999')).toBeNull();
    expect(parseDimension('12.5')).toBeNull();
    expect(parseDimension(null)).toBeNull();
  });
});
