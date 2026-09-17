import Jimp from "jimp-compact";

// Avatars are stored as bytea directly on app_users (see migration 004) --
// resizing/recompressing here keeps that row small regardless of what the
// client uploaded, and gives every avatar a predictable byte budget.
const AVATAR_SIZE = 256;
const JPEG_QUALITY = 82;
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // raw upload cap, before resize

export class AvatarError extends Error {}

export interface ProcessedAvatar {
  data: Buffer;
  contentType: string;
}

export async function processAvatarUpload(base64: string): Promise<ProcessedAvatar> {
  const raw = Buffer.from(base64, "base64");
  if (raw.length === 0) throw new AvatarError("Image data is empty.");
  if (raw.length > MAX_UPLOAD_BYTES) {
    throw new AvatarError(`Image is too large (max ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB before processing).`);
  }

  let image;
  try {
    image = await Jimp.read(raw);
  } catch {
    throw new AvatarError("Could not read image. Use a JPEG, PNG, or WebP photo.");
  }

  image.cover(AVATAR_SIZE, AVATAR_SIZE).quality(JPEG_QUALITY);
  const data: Buffer = await image.getBufferAsync(Jimp.MIME_JPEG);
  return { data, contentType: "image/jpeg" };
}
