import { detectMimeFromMagic, validateImageBuffer } from '../utils/validators';
import { sanitizeError } from '../utils/sanitizer';

describe('validators (FR-200)', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  const gif = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
  const webp = Buffer.from([
    0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
  ]);
  const junk = Buffer.from([0x00, 0x01, 0x02, 0x03]);

  it('detects PNG/JPEG/GIF/WebP magic bytes', () => {
    expect(detectMimeFromMagic(png)).toBe('image/png');
    expect(detectMimeFromMagic(jpeg)).toBe('image/jpeg');
    expect(detectMimeFromMagic(gif)).toBe('image/gif');
    expect(detectMimeFromMagic(webp)).toBe('image/webp');
    expect(detectMimeFromMagic(junk)).toBeNull();
  });

  it('rejects oversized files', () => {
    const big = Buffer.alloc(5 * 1024 * 1024 + 1, 0xff);
    big[0] = 0xff;
    big[1] = 0xd8;
    big[2] = 0xff;
    expect(() => validateImageBuffer(big)).toThrow(/5MB/);
  });

  it('rejects mismatched declared mime', () => {
    expect(() => validateImageBuffer(png, 'image/jpeg')).toThrow(/mismatched|corrupted/i);
  });
});

describe('sanitizer (NFR-400.4)', () => {
  it('redacts urls, bearer tokens, and passwords', () => {
    const out = sanitizeError('fail https://evil.example/x Bearer abc.def password=secret');
    expect(out).not.toMatch(/https?:\/\//);
    expect(out).not.toMatch(/Bearer\s+\S+/);
    expect(out).toContain('[REDACTED]');
  });
});
