import { readFile } from "node:fs/promises";
import path from "node:path";
import { UPLOAD_EXTENSIONS, resolveUploadPath } from "@/lib/uploads";

/** Serves runtime uploads (portrait, publication PDFs) from the volume-backed uploads dir. */
export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  const filePath = resolveUploadPath(segments);
  const contentType = filePath ? UPLOAD_EXTENSIONS[path.extname(filePath)] : undefined;
  if (!filePath || !contentType) return new Response("Not found", { status: 404 });

  try {
    const data = await readFile(filePath);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
