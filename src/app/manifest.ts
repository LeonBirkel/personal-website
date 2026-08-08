import type { MetadataRoute } from "next";
import { getSiteConfig } from "@/config/site-config";
import { frameworkTheme } from "@/config/theme";

// Regenerated through ISR so the shared image serves the runtime config, not
// the example person it was built with.
export const revalidate = 300;

export default function manifest(): MetadataRoute.Manifest {
  const { person } = getSiteConfig();
  return {
    name: person.name,
    short_name: person.name,
    description: person.description,
    start_url: "/",
    display: "browser",
    background_color: frameworkTheme.lightBg,
    theme_color: frameworkTheme.lightBg,
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png" },
    ],
  };
}
