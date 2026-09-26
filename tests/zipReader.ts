import { crc32 } from "@/lib/zip";

// An independent reader for the zip files our writer makes, so tests can look
// inside them: it follows the central directory, checks each CRC, and returns
// the files by name.
export function unzip(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();

  // The end-of-central-directory record is the last 22 bytes (no comment).
  const eocd = bytes.length - 22;
  if (view.getUint32(eocd, true) !== 0x06054b50) throw new Error("no end record");
  const count = view.getUint16(eocd + 10, true);
  const centralSize = view.getUint32(eocd + 12, true);
  const centralStart = view.getUint32(eocd + 16, true);
  if (centralStart + centralSize !== eocd) throw new Error("central directory doesn't end where the end record starts");

  const files: Record<string, string> = {};
  let pos = centralStart;
  for (let i = 0; i < count; i++) {
    if (view.getUint32(pos, true) !== 0x02014b50) throw new Error("bad central entry");
    const method = view.getUint16(pos + 10, true);
    const crc = view.getUint32(pos + 16, true);
    const size = view.getUint32(pos + 24, true);
    const nameLength = view.getUint16(pos + 28, true);
    const offset = view.getUint32(pos + 42, true);
    const name = decoder.decode(bytes.subarray(pos + 46, pos + 46 + nameLength));

    if (view.getUint32(offset, true) !== 0x04034b50) throw new Error("bad local header");
    if (method !== 0) throw new Error("only stored files");
    const localNameLength = view.getUint16(offset + 26, true);
    const localExtra = view.getUint16(offset + 28, true);
    const start = offset + 30 + localNameLength + localExtra;
    const data = bytes.subarray(start, start + size);
    if (crc32(data) !== crc) throw new Error(`CRC mismatch for ${name}`);
    files[name] = decoder.decode(data);
    pos += 46 + nameLength;
  }
  return files;
}
