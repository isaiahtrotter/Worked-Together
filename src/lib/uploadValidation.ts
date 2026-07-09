export const AVATAR_MAX_BYTES = 1 * 1024 * 1024;
export const AVATAR_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const WORK_SAMPLE_MAX_BYTES = 3 * 1024 * 1024;
export const WORK_SAMPLE_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export function validateFile(
  file: File,
  { maxBytes, allowedTypes }: { maxBytes: number; allowedTypes: string[] },
): string | null {
  if (!allowedTypes.includes(file.type)) {
    return `Unsupported file type. Allowed: ${allowedTypes
      .map((t) => t.replace("image/", ""))
      .join(", ")}.`;
  }
  if (file.size > maxBytes) {
    return `File is too large. Max ${Math.round(maxBytes / (1024 * 1024))}MB.`;
  }
  return null;
}

export function extensionFor(file: File): string {
  const fromType = file.type.split("/")[1];
  return fromType === "jpeg" ? "jpg" : fromType;
}
