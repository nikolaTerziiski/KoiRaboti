import type { PayUnits } from "./types";

export function parseNumber(
  value: FormDataEntryValue | null,
  fieldName: string,
): number {
  const parsed = Number(value ?? "");
  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName} must be a valid number.`);
  }

  return parsed;
}

export function normalizeText(
  value: FormDataEntryValue | string | null | undefined,
): string | null {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

export function isValidPayUnits(value: number): value is PayUnits {
  return value === 1 || value === 1.5 || value === 2;
}

export function parseJsonArray(
  rawValue: FormDataEntryValue | null,
  fieldName: string,
): unknown[] {
  if (!rawValue) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(String(rawValue));
  } catch {
    throw new Error(`${fieldName} contains invalid JSON.`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`${fieldName} is invalid.`);
  }

  return parsed;
}
