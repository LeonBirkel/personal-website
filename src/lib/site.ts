import { getSiteUrl } from "@/config/site-config";

/** Absolute URL on the configured site origin (no trailing slash normalization needed for ""). */
export function absoluteUrl(path: string): string {
  return new URL(path, getSiteUrl()).toString();
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
