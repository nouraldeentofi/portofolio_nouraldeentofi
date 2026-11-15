/**
 * The pixel size of an image, read from the first bytes of the file.
 *
 * A share image is announced with its width and height, and a number typed
 * by hand next to a file drifts the day the file is re-shot. The loader
 * measures every picture the pages announce a size for, so what the markup
 * says is what the file is.
 *
 * Pure: bytes in, `[width, height]` out, or null for a format it does not
 * know. WebP (all three encodings) and PNG are the formats the site uses.
 */

const ascii = (buf, at, len) => String.fromCharCode(...buf.subarray(at, at + len));
const u24 = (buf, at) => buf[at] | (buf[at + 1] << 8) | (buf[at + 2] << 16);

export function imageSize(buf) {
  if (!buf || buf.length < 30) return null;

  // PNG: the IHDR chunk comes first, width and height as big-endian 32-bit.
  if (buf[0] === 0x89 && ascii(buf, 1, 3) === 'PNG') {
    return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
  }

  if (ascii(buf, 0, 4) !== 'RIFF' || ascii(buf, 8, 4) !== 'WEBP') return null;
  const chunk = ascii(buf, 12, 4);

  // Extended: the canvas size, each stored as one less than its value.
  if (chunk === 'VP8X') return [u24(buf, 24) + 1, u24(buf, 27) + 1];

  // Lossless: one signature byte, then 14 bits of width and 14 of height.
  if (chunk === 'VP8L') {
    const bits = buf.readUInt32LE(21);
    return [(bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1];
  }

  // Lossy: a three-byte frame tag and a start code, then the two sizes.
  if (chunk === 'VP8 ') return [buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff];

  return null;
}
