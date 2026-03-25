import { getFileUrl } from "./api";

/**
 * Download a photo from Telegram and return it as base64 for Gemini Vision.
 * Picks the highest resolution photo from the array.
 */
export async function downloadPhoto(
  fileId: string,
): Promise<{ base64: string; mimeType: string } | null> {
  const url = await getFileUrl(fileId);
  if (!url) return null;

  const response = await fetch(url);
  if (!response.ok) return null;

  const buffer = await response.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");

  // Telegram photos are always JPEG
  return { base64, mimeType: "image/jpeg" };
}
