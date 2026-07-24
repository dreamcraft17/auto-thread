import path from 'path';

const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_FILES_PER_POST = 4;

export function maxMediaPerPost() {
  return MAX_FILES_PER_POST;
}

export function maxUploadBytes() {
  return MAX_BYTES;
}

export function isAllowedMime(mime: string) {
  return ALLOWED_MIME.has(mime);
}

export function detectMimeFromMagic(buf: Buffer): string | null {
  if (buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length >= 3 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return 'image/gif';
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return 'image/webp';
  }
  return null;
}

export function validateImageBuffer(buffer: Buffer, declaredMime?: string): { mime: string } {
  if (!buffer?.length) throw Object.assign(new Error('Empty file'), { status: 400 });
  if (buffer.length > MAX_BYTES) {
    throw Object.assign(new Error('File size exceeds 5MB limit'), { status: 400 });
  }
  const magicMime = detectMimeFromMagic(buffer);
  if (!magicMime) {
    throw Object.assign(new Error('Unsupported media type: file signature not recognized'), { status: 415 });
  }
  if (declaredMime && declaredMime !== magicMime && !(declaredMime === 'image/jpg' && magicMime === 'image/jpeg')) {
    // allow slight mismatch only for jpeg aliases
    if (declaredMime !== 'image/jpg') {
      throw Object.assign(new Error('File corrupted or mismatched type'), { status: 415 });
    }
  }
  if (!isAllowedMime(magicMime)) {
    throw Object.assign(new Error(`Unsupported media type: ${magicMime}`), { status: 415 });
  }
  return { mime: magicMime };
}

export function extForMime(mime: string) {
  switch (mime) {
    case 'image/png':
      return '.png';
    case 'image/jpeg':
      return '.jpg';
    case 'image/gif':
      return '.gif';
    case 'image/webp':
      return '.webp';
    default:
      return path.extname(mime) || '.bin';
  }
}
