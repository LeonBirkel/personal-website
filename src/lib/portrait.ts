import { existsSync } from "node:fs";
import { join } from "node:path";
import { getSiteConfig } from "@/config/site-config";
import { UPLOADS_DIR } from "@/lib/uploads";

/**
 * The size this framework expects at `ogImagePath`. 1.91:1 is what Facebook and
 * LinkedIn render as a full-width card, and 1200x630 is twice the documented
 * minimum, so it clears the small-thumbnail fallback at retina quality.
 */
export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

const UPLOAD_PREFIX = "/uploads/";

/**
 * Resolve a configured public path to a file on disk. Anything under /uploads/
 * lives on the volume, so an admin upload is visible without a restart.
 * Everything else is a build-time asset in public/.
 */
function resolveFile(publicPath: string): string {
  return publicPath.startsWith(UPLOAD_PREFIX)
    ? join(UPLOADS_DIR, publicPath.slice(UPLOAD_PREFIX.length))
    : join(process.cwd(), "public", publicPath);
}

/**
 * The portrait backs the JSON-LD `image`. It must be omitted while the file is
 * missing so the entity graph never references a 404. Checked per call, which
 * is what lets a fresh upload appear on the next ISR regeneration.
 */
export function portraitExists(): boolean {
  return existsSync(resolveFile(getSiteConfig().person.portraitPath));
}

/** The dedicated 1200x630 link-preview crop, as opposed to the portrait fallback. */
export function ogImageExists(): boolean {
  return existsSync(resolveFile(getSiteConfig().person.ogImagePath));
}

/**
 * The og:image, which is a different job from the portrait. A tall portrait
 * handed to a link preview gets centre-cropped by each platform's own rules,
 * and on a head-and-shoulders photo that lands on the chin. So a dedicated
 * landscape crop wins whenever one exists.
 *
 * Falling back to the portrait keeps a card on the page rather than none. The
 * dimensions are only declared for the dedicated crop, whose size this
 * framework defines. The fallback is whatever the admin happened to upload, and
 * claiming a size for it would be a guess.
 */
export function resolveOgImage(): { url: string; width?: number; height?: number } | null {
  const { ogImagePath, portraitPath } = getSiteConfig().person;
  if (ogImageExists()) return { url: ogImagePath, ...OG_IMAGE_SIZE };
  if (existsSync(resolveFile(portraitPath))) return { url: portraitPath };
  return null;
}
