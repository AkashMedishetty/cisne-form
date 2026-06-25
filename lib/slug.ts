// Turn an arbitrary display name into a filesystem/URL-safe slug.
// "José M. Núñez!" -> "jose-m-nunez"
export function slugifyName(name: string): string {
  const slug = name
    .normalize("NFKD") // split accented chars into base + diacritic
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // non-alphanumerics -> hyphen
    .replace(/^-+|-+$/g, "") // trim hyphens
    .slice(0, 60);
  return slug || "submission";
}

// Map a MIME type to a sensible file extension.
export function extensionForType(type: string): string {
  switch (type.toLowerCase()) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/heic":
      return "heic";
    case "image/heif":
      return "heif";
    default:
      return "jpg";
  }
}

/**
 * Ensure a file name is unique within a set of already-used names by appending
 * "-2", "-3", ... before the extension. Mutates the provided Set.
 */
export function uniqueFileName(desired: string, used: Set<string>): string {
  if (!used.has(desired.toLowerCase())) {
    used.add(desired.toLowerCase());
    return desired;
  }

  const dot = desired.lastIndexOf(".");
  const base = dot === -1 ? desired : desired.slice(0, dot);
  const ext = dot === -1 ? "" : desired.slice(dot);

  let i = 2;
  let candidate = `${base}-${i}${ext}`;
  while (used.has(candidate.toLowerCase())) {
    i += 1;
    candidate = `${base}-${i}${ext}`;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}
