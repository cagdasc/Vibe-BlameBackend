import { Payload } from '../types/inspector';

export const DEFAULT_MAX_BODY_SIZE_BYTES = 64 * 1024; // 64 KB default limit

const BINARY_MIME_PATTERNS = [
  /^image\//i,
  /^audio\//i,
  /^video\//i,
  /^font\//i,
  /^application\/octet-stream/i,
  /^application\/pdf/i,
  /^application\/zip/i,
  /^application\/gzip/i,
  /^application\/vnd\./i
];

export function isBinaryMime(contentType: string | null): boolean {
  if (!contentType) return false;
  const mime = contentType.split(';')[0].trim().toLowerCase();
  return BINARY_MIME_PATTERNS.some(pattern => pattern.test(mime));
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function createPayload(
  content: string | Uint8Array,
  contentType: string | null,
  maxSizeBytes: number = DEFAULT_MAX_BODY_SIZE_BYTES
): Payload {
  const isBinary = isBinaryMime(contentType);

  if (typeof content === 'string') {
    const rawBytes = new TextEncoder().encode(content);
    const sizeBytes = rawBytes.length;
    const truncated = sizeBytes > maxSizeBytes;

    if (isBinary) {
      return {
        contentType,
        sizeBytes,
        content: null,
        truncated,
        isBinary: true,
        hexPreview: generateHexPreview(rawBytes.slice(0, Math.min(rawBytes.length, 128)))
      };
    }

    const finalContent = truncated ? content.slice(0, maxSizeBytes) : content;

    return {
      contentType,
      sizeBytes,
      content: finalContent,
      truncated,
      isBinary: false
    };
  } else {
    const sizeBytes = content.length;
    const truncated = sizeBytes > maxSizeBytes;

    return {
      contentType,
      sizeBytes,
      content: null,
      truncated,
      isBinary: true,
      hexPreview: generateHexPreview(content.slice(0, Math.min(content.length, 128)))
    };
  }
}

export function generateHexPreview(bytes: Uint8Array): string {
  const lines: string[] = [];
  for (let i = 0; i < bytes.length; i += 16) {
    const chunk = bytes.slice(i, i + 16);
    const hex = Array.from(chunk)
      .map(b => b.toString(16).padStart(2, '0').toUpperCase())
      .join(' ');
    const ascii = Array.from(chunk)
      .map(b => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.'))
      .join('');
    lines.push(`${i.toString(16).padStart(4, '0')}  ${hex.padEnd(48, ' ')}  |${ascii}|`);
  }
  return lines.join('\n');
}
