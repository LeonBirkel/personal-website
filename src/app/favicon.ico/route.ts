import pngToIco from "png-to-ico";
import { iconImage } from "@/lib/icon-image";

/**
 * Google shows favicons in results, so a real /favicon.ico must exist.
 * Rendered once per process from the runtime config and memoized: the
 * config cannot change without a restart.
 */
let cached: Buffer | null = null;

export async function GET() {
  if (!cached) {
    const png = Buffer.from(await iconImage(48).arrayBuffer());
    cached = await pngToIco(png);
  }
  return new Response(new Uint8Array(cached), {
    headers: {
      "Content-Type": "image/x-icon",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
