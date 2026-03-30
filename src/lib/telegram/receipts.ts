import { getFileUrl } from "./api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/** Download result includes buffer for Storage upload + base64 for Gemini Vision. */
export interface PhotoDownload {
  base64: string;
  mimeType: string;
  buffer: ArrayBuffer;
}

/**
 * Download a photo from Telegram.
 * Returns base64 (for Gemini Vision) and raw buffer (for Storage upload).
 */
export async function downloadPhoto(
  fileId: string,
): Promise<PhotoDownload | null> {
  const url = await getFileUrl(fileId);
  if (!url) return null;

  const response = await fetch(url);
  if (!response.ok) return null;

  const buffer = await response.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");

  return { base64, mimeType: "image/jpeg", buffer };
}

/**
 * Upload a receipt image to Supabase Storage.
 * Returns the storage path, or null on failure.
 */
export async function uploadReceiptToStorage(
  restaurantId: string,
  buffer: ArrayBuffer,
  mimeType: string,
): Promise<string | null> {
  const db = getSupabaseAdminClient();
  const ext = mimeType === "image/jpeg" ? "jpg" : "png";
  const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const filePath = `${restaurantId}/${uniqueId}.${ext}`;

  const { data, error } = await db.storage
    .from("receipts")
    .upload(filePath, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    console.error("[Storage] Error uploading receipt:", error);
    return null;
  }

  return data.path;
}
