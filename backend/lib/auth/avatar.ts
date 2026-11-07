import Jimp from "jimp-compact";

// Avatars are stored as bytea directly on app_users (see migration 004) --
// resizing/recompressing here keeps that row small regardless of what the
// client uploaded, and gives every avatar a predictable byte budget.
const AVATAR_SIZE = 256;
const JPEG_QUALITY = 82;
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // raw upload cap, before resize

// REQ-116 (audit 3, finding 6): the byte cap alone let a 61 KB PNG that
// claims 8000x8000 pixels take the process from 267 to 652 MB while
// decoding (16000x16000 would pass 1 GB). The image header is read first and
// anything wider or taller than MAX_SIDE, or larger than MAX_PIXELS, is
// refused before any pixel is decoded. Only PNG and JPEG are accepted --
// they are what phone cameras and the app's picker produce, and Jimp has no
// WebP decoder (a WebP upload always failed). The JPEG decoder is also given
// its own resolution and memory ceiling, in case a file's header and its
// frames disagree.
export const MAX_SIDE = 4096;
export const MAX_PIXELS = 16_000_000;

export class AvatarError extends Error {}

export interface ProcessedAvatar {
  data: Buffer;
  contentType: string;
}

export interface ImageHeader {
  format: "png" | "jpeg";
  width: number;
  height: number;
}

// Width and height from the file header, without decoding. Null when the
// bytes are not a PNG or JPEG this can read.
export function readImageHeader(buf: Buffer): ImageHeader | null {
  // PNG: 8-byte signature, then the IHDR chunk (length, "IHDR", width, height).
  if (buf.length >= 24 && buf.readUInt32BE(0) === 0x89504e47 && buf.readUInt32BE(4) === 0x0d0a1a0a) {
    if (buf.toString("latin1", 12, 16) !== "IHDR") return null;
    return { format: "png", width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  // JPEG: walk the marker segments to the first start-of-frame (SOF0-SOF15,
  // except DHT C4, JPG C8 and DAC CC), whose payload holds height then width.
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 4 <= buf.length) {
      if (buf[i] !== 0xff) return null;
      const marker = buf[i + 1];
      if (marker === 0xff) {
        i += 1; // fill byte
        continue;
      }
      if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
        i += 2; // markers with no length
        continue;
      }
      if (marker === 0xd9 || marker === 0xda) return null; // end of image / start of scan before any frame
      const len = buf.readUInt16BE(i + 2);
      if (len < 2) return null;
      const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSof) {
        if (i + 9 > buf.length) return null;
        return { format: "jpeg", height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      }
      i += 2 + len;
    }
    return null;
  }
  return null;
}

export function checkImageHeader(raw: Buffer): ImageHeader {
  const header = readImageHeader(raw);
  if (!header) throw new AvatarError("Could not read image. Use a JPEG or PNG photo.");
  const { width, height } = header;
  if (width < 1 || height < 1 || width > MAX_SIDE || height > MAX_SIDE || width * height > MAX_PIXELS) {
    throw new AvatarError(`Image is too large. Use a photo no bigger than ${MAX_SIDE} x ${MAX_SIDE} pixels.`);
  }
  return header;
}

// Applied once: the bundled jpeg-js decoder takes limits as its second
// argument, which Jimp never passes (defaults: 100 MP, 512 MB).
let jpegLimited = false;
function limitJpegDecoder() {
  if (jpegLimited) return;
  const decoders = (Jimp as unknown as { decoders: Record<string, (data: Buffer, opts?: unknown) => unknown> }).decoders;
  const original = decoders["image/jpeg"];
  if (typeof original === "function") {
    decoders["image/jpeg"] = (data: Buffer) =>
      original(data, { maxResolutionInMP: MAX_PIXELS / 1_000_000, maxMemoryUsageInMB: 128 });
  }
  jpegLimited = true;
}

export async function processAvatarUpload(base64: string): Promise<ProcessedAvatar> {
  const raw = Buffer.from(base64, "base64");
  if (raw.length === 0) throw new AvatarError("Image data is empty.");
  if (raw.length > MAX_UPLOAD_BYTES) {
    throw new AvatarError(`Image is too large (max ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB before processing).`);
  }
  checkImageHeader(raw);
  limitJpegDecoder();

  let image;
  try {
    image = await Jimp.read(raw);
  } catch {
    throw new AvatarError("Could not read image. Use a JPEG or PNG photo.");
  }

  image.cover(AVATAR_SIZE, AVATAR_SIZE).quality(JPEG_QUALITY);
  const data: Buffer = await image.getBufferAsync(Jimp.MIME_JPEG);
  return { data, contentType: "image/jpeg" };
}
