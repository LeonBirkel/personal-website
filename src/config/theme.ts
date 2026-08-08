/**
 * Framework-fixed neutral palette. These values match the defaults in
 * globals.css and are shared by the viewport theme colors, the web manifest
 * and the icon routes. Instance-specific accent colors live in
 * site.config.json, not here.
 */
export const frameworkTheme = {
  lightBg: "#fbfbf9",
  darkBg: "#101113",
  iconTileBg: "#1a1b1e",
  iconTileFg: "#fbfbf9",
} as const;
