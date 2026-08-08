import { existsSync } from "node:fs";
import { join } from "node:path";
import { getSiteConfig } from "@/config/site-config";
import { UPLOADS_DIR } from "@/lib/uploads";

/**
 * The portrait is referenced by JSON-LD `image` and og:image. Both must be
 * omitted while the file is missing so the entity graph never references a
 * 404. Checked per call: paths under /uploads/ resolve against the uploads
 * volume, so an admin upload becomes visible on the next ISR regeneration
 * without a restart. Anything else resolves against public/.
 */
export function portraitExists(): boolean {
  const { portraitPath } = getSiteConfig().person;
  const uploadPrefix = "/uploads/";
  const file = portraitPath.startsWith(uploadPrefix)
    ? join(UPLOADS_DIR, portraitPath.slice(uploadPrefix.length))
    : join(process.cwd(), "public", portraitPath);
  return existsSync(file);
}
