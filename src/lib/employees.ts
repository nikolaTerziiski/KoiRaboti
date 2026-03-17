/**
 * Strip all non-digit characters from a phone number for uniqueness comparison.
 * The formatted value is stored as-is; this is only used for duplicate detection.
 */
export function normalizePhoneNumber(phone: string): string {
  return phone.replace(/\D/g, "");
}
