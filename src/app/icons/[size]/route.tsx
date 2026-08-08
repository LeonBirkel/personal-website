import { iconImage } from "@/lib/icon-image";

/**
 * PNG icons for the web manifest at stable URLs (/icons/192, /icons/512).
 * Rendered per request from the runtime config, so a shared image serves
 * every instance's initials and accent color.
 */
const ALLOWED_SIZES = new Set([192, 512]);

export async function GET(_request: Request, { params }: { params: Promise<{ size: string }> }) {
  const size = Number((await params).size);
  if (!ALLOWED_SIZES.has(size)) {
    return new Response("Not found", { status: 404 });
  }
  return iconImage(size);
}
