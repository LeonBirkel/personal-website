import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getInitials, getSiteConfig } from "@/config/site-config";
import { frameworkTheme } from "@/config/theme";

/**
 * Renders the favicon composition at any size: dark tile, the configured
 * initials in IBM Plex Mono, and an accent bar. Replaces the old static
 * icon.svg pipeline so one shared image serves every instance's initials
 * and accent color.
 */

// Framework asset, bundled with the app. OFL license sits next to the file.
const plexMonoSemiBold = readFileSync(
  join(process.cwd(), "src/assets/fonts/IBMPlexMono-SemiBold.woff"),
);

export function iconImage(size: number): ImageResponse {
  const initials = getInitials();
  const accentDark = getSiteConfig().theme.accent.dark;
  const k = size / 64;
  // Two characters fit beside the bar at the classic 32px; three need less.
  const fontSize = (initials.length <= 2 ? 32 : 20) * k;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        backgroundColor: frameworkTheme.iconTileBg,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 7 * k,
          top: 20 * k,
          fontFamily: "IBM Plex Mono",
          fontSize,
          fontWeight: 600,
          lineHeight: 1,
          color: frameworkTheme.iconTileFg,
        }}
      >
        {initials}
      </div>
      <div
        style={{
          position: "absolute",
          left: 48 * k,
          top: 19 * k,
          width: 7 * k,
          height: 27 * k,
          backgroundColor: accentDark,
        }}
      />
    </div>,
    {
      width: size,
      height: size,
      fonts: [{ name: "IBM Plex Mono", data: plexMonoSemiBold, weight: 600, style: "normal" }],
    },
  );
}
