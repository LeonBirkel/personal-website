import { iconImage } from "@/lib/icon-image";

// Regenerated through ISR so the shared image serves the runtime config's
// initials and accent, not the example person it was built with.
export const revalidate = 300;

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return iconImage(64);
}
