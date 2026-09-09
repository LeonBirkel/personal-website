import { getSiteConfig, getSiteUrl } from "@/config/site-config";

/**
 * Notify Bing, Yandex, Seznam, and Naver of changed URLs in one ping.
 * Only fires from the canonical production origin with a configured key.
 * dev and CI stay silent.
 */
export type IndexNowStatus = "on" | "no-key" | "off-origin";

/**
 * Why a ping is or is not sent, shared with the admin dashboard so the panel
 * cannot claim "pings on" for a condition the ping itself would skip.
 */
export function indexNowStatus(): IndexNowStatus {
  if (!process.env.INDEXNOW_KEY) return "no-key";
  return getSiteUrl() === getSiteConfig().site.canonicalOrigin ? "on" : "off-origin";
}

export async function pingIndexNow(paths: string[]): Promise<void> {
  if (indexNowStatus() !== "on") return;
  const key = process.env.INDEXNOW_KEY;
  const origin = getSiteConfig().site.canonicalOrigin;

  const host = new URL(origin).host;
  try {
    await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host,
        key,
        keyLocation: `${origin}/${key}.txt`,
        urlList: paths.map((p) => `${origin}${p}`),
      }),
    });
  } catch (error) {
    console.error("IndexNow ping failed", error);
  }
}
