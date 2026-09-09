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

/** Date and time to the minute, always UTC, for operational timestamps in the admin. */
export function formatDateTime(date: Date): string {
  const text = date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "UTC",
  });
  return `${text} UTC`;
}

/** Coarse human duration: "3 d 2 h", "5 h 12 min", "8 min". */
export function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  if (days > 0) return `${days} d ${hours} h`;
  if (hours > 0) return `${hours} h ${minutes} min`;
  return `${minutes} min`;
}
