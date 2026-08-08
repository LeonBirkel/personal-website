import { iconImage } from "@/lib/icon-image";

/**
 * PNG icons for the web manifest at stable URLs (/icons/192, /icons/512).
 * Rendered once per process and size, then memoized like /favicon.ico: the
 * satori plus resvg render blocks the event loop, so it must not run per
 * request. The revalidate window keeps the route regenerable, so the
 * build-time example icon never outlives the boot flush.
 */
export const revalidate = 300;

const ALLOWED_SIZES = new Set([192, 512]);

const cache = new Map<number, Buffer>();

export async function GET(_request: Request, { params }: { params: Promise<{ size: string }> }) {
  const size = Number((await params).size);
  if (!ALLOWED_SIZES.has(size)) {
    return new Response("Not found", { status: 404 });
  }
  let png = cache.get(size);
  if (!png) {
    png = Buffer.from(await iconImage(size).arrayBuffer());
    cache.set(size, png);
  }
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
