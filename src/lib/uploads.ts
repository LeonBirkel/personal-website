import path from "node:path";

export const UPLOADS_DIR = path.resolve(process.env.UPLOADS_DIR ?? "./uploads");

export const UPLOAD_EXTENSIONS: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".bib": "application/x-bibtex",
  ".txt": "text/plain",
};

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

/** Flatten any client-supplied name into a single safe path segment. */
export function safeUploadName(fileName: string): string | null {
  const base = path
    .basename(fileName)
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-");
  const trimmed = base.replace(/^[.-]+/, "");
  const ext = path.extname(trimmed);
  if (!trimmed || !(ext in UPLOAD_EXTENSIONS)) return null;
  return trimmed;
}

/** Resolve a requested upload path, refusing anything that escapes UPLOADS_DIR. */
export function resolveUploadPath(segments: string[]): string | null {
  const resolved = path.resolve(UPLOADS_DIR, ...segments);
  if (resolved !== UPLOADS_DIR && !resolved.startsWith(UPLOADS_DIR + path.sep)) return null;
  return resolved;
}
