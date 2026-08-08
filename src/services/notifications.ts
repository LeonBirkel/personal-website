import { getSiteConfig, getSiteUrl } from "@/config/site-config";
import type { ContactInput } from "@/lib/validation";
import { getSetting } from "@/services/settings";

/** GlobalSettings key holding the Discord webhook URL. No row means off. */
export const DISCORD_WEBHOOK_KEY = "notify:discord-webhook";

export const DISCORD_WEBHOOK_PATTERN =
  /^https:\/\/(?:ptb\.|canary\.)?(?:discord|discordapp)\.com\/api\/webhooks\/\d+\/[\w-]+$/;

const REQUEST_TIMEOUT_MS = 5_000;

/** Discord rejects embed descriptions beyond 4096 characters. */
const DESCRIPTION_LIMIT = 4096;

type DiscordEmbed = {
  title: string;
  url: string;
  color: number;
  description: string;
  fields?: { name: string; value: string }[];
  timestamp: string;
};

/** The site accent doubles as the embed stripe. The schema guarantees six-digit hex. */
function embedColor(): number {
  return parseInt(getSiteConfig().theme.accent.light.slice(1), 16);
}

/**
 * Discord renders markdown inside embeds, including masked [label](url)
 * links, so visitor text could disguise a hostile URL as a trusted one.
 * Escaping the control characters makes every submission render literally.
 */
function escapeDiscordMarkdown(text: string): string {
  return text.replace(/[\\*_~`|[\]()>#]/g, "\\$&");
}

/** Returns null on success, otherwise a short failure reason. Never throws. */
async function postEmbed(webhookUrl: string, embed: DiscordEmbed): Promise<string | null> {
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    return response.ok ? null : `Discord answered ${response.status}`;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

/**
 * Post a new inquiry to the configured Discord webhook. Failures are only
 * logged: the inquiry is already stored, and a Discord outage must never
 * surface as an error to the visitor. User text goes into an embed, which
 * cannot ping roles or @everyone, and is markdown-escaped so it renders
 * literally.
 */
export async function notifyInquiryReceived(inquiry: ContactInput): Promise<void> {
  const webhookUrl = await getSetting(DISCORD_WEBHOOK_KEY);
  if (!webhookUrl) return;

  const escaped = escapeDiscordMarkdown(inquiry.message);
  const message =
    escaped.length > DESCRIPTION_LIMIT ? `${escaped.slice(0, DESCRIPTION_LIMIT - 1)}…` : escaped;
  const failure = await postEmbed(webhookUrl, {
    title: "New contact inquiry",
    url: `${getSiteUrl()}/admin/inquiries`,
    color: embedColor(),
    fields: [
      {
        name: "From",
        value: `${escapeDiscordMarkdown(inquiry.name)} <${escapeDiscordMarkdown(inquiry.email)}>`,
      },
      { name: "Subject", value: escapeDiscordMarkdown(inquiry.subject) },
    ],
    description: message,
    timestamp: new Date().toISOString(),
  });
  if (failure) console.error(`Discord inquiry notification failed: ${failure}`);
}

/** Returns null on success, otherwise the failure reason for the admin form. */
export async function sendTestNotification(webhookUrl: string): Promise<string | null> {
  return postEmbed(webhookUrl, {
    title: "Test notification",
    url: `${getSiteUrl()}/admin/settings`,
    color: embedColor(),
    description: "The Discord webhook works. New contact inquiries will arrive here.",
    timestamp: new Date().toISOString(),
  });
}
