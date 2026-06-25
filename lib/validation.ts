// Shared validation helpers used by both the client form and the server route.

// Pragmatic email regex: requires a local part, an @, a domain with a dot, and a
// TLD of at least two characters. Good enough to catch typos without rejecting
// valid-but-unusual addresses.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(email: string): boolean {
  const value = email.trim();
  return value.length <= 254 && EMAIL_RE.test(value);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidName(name: string): boolean {
  const value = name.trim();
  return value.length >= 2 && value.length <= 100;
}

export const MAX_FILE_MB = 4; // kept under Vercel's ~4.5 MB request body limit
export const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

export function isAllowedImageType(type: string): boolean {
  return ALLOWED_IMAGE_TYPES.includes(type.toLowerCase());
}
