import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getSiteConfig } from "@/config/site-config";
import { auth } from "@/lib/auth";
import { MAX_UPLOAD_BYTES, UPLOADS_DIR, safeUploadName } from "@/lib/uploads";
import { afterContentMutation } from "@/services/revalidate";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || role !== "admin") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_UPLOAD_BYTES + 4096) {
    return Response.json({ error: "File too large (max 20 MB)" }, { status: 413 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return Response.json({ error: "File too large (max 20 MB)" }, { status: 400 });
  }

  const name = safeUploadName(file.name);
  if (!name) {
    return Response.json(
      { error: "Unsupported file type (jpg, png, webp, pdf, bib, txt)" },
      { status: 400 },
    );
  }

  await mkdir(UPLOADS_DIR, { recursive: true });
  await writeFile(path.join(UPLOADS_DIR, name), Buffer.from(await file.arrayBuffer()));

  // A fresh portrait or link-preview image must show up in JSON-LD image and
  // og:image without waiting out the ISR window.
  const { portraitPath, ogImagePath } = getSiteConfig().person;
  if ([portraitPath, ogImagePath].includes(`/uploads/${name}`)) {
    await afterContentMutation(["/"]);
  }

  return Response.json({ url: `/uploads/${name}` });
}
