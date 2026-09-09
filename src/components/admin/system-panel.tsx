import { formatDateTime, formatDuration } from "@/lib/site";
import type { SystemInfo } from "@/services/system-info";

type Fact = { label: string; value: string; attention?: boolean };

const INDEXNOW_TEXT: Record<SystemInfo["checks"]["indexNow"], Fact> = {
  on: { label: "IndexNow", value: "key set, pings on" },
  "no-key": { label: "IndexNow", value: "no key, pings off", attention: true },
  "off-origin": {
    label: "IndexNow",
    value: "key set, but this origin is not the canonical one, pings off",
    attention: true,
  },
};

const TURNSTILE_TEXT: Record<SystemInfo["checks"]["turnstile"], Fact> = {
  real: { label: "Turnstile", value: "real keys" },
  test: {
    label: "Turnstile",
    value: "Cloudflare test keys, the form is unprotected",
    attention: true,
  },
  missing: { label: "Turnstile", value: "no secret, the form rejects everything", attention: true },
};

function buildLine({ gitSha, builtAt }: SystemInfo["build"]): string {
  if (!gitSha) return "not recorded (local build)";
  return builtAt ? `${gitSha.slice(0, 12)}, ${formatDateTime(builtAt)}` : gitSha.slice(0, 12);
}

function groups(info: SystemInfo): { title: string; facts: Fact[] }[] {
  const { runtime, frameworks, instance, checks } = info;
  return [
    {
      title: "Release",
      facts: [
        { label: "Version", value: `v${info.version}` },
        { label: "Build", value: buildLine(info.build) },
        {
          label: "Started",
          value: `${formatDateTime(runtime.startedAt)}, up ${formatDuration(runtime.uptimeSeconds)}`,
        },
        { label: "Runtime", value: `Node ${runtime.node}, ${runtime.platform}` },
        {
          label: "Framework",
          value: `Next.js ${frameworks.next}, Prisma ${frameworks.prisma}, Better-Auth ${frameworks.betterAuth}`,
        },
      ],
    },
    {
      title: "Instance",
      facts: [
        { label: "Canonical origin", value: instance.canonicalOrigin },
        {
          label: "Config file",
          value: instance.configModifiedAt
            ? `modified ${formatDateTime(instance.configModifiedAt)}`
            : "not found",
          attention: !instance.configModifiedAt,
        },
        {
          label: "Content seeded",
          value: instance.seededAt ? formatDateTime(instance.seededAt) : "not yet",
        },
        {
          label: "Last inquiry",
          value: instance.lastInquiryAt ? formatDateTime(instance.lastInquiryAt) : "none yet",
        },
        { label: "Spam filtered", value: `${instance.spamFiltered} stored` },
      ],
    },
    {
      title: "Checks",
      facts: [
        TURNSTILE_TEXT[checks.turnstile],
        {
          label: "Discord",
          value: checks.discordWebhook ? "notifications on" : "no webhook, notifications off",
        },
        INDEXNOW_TEXT[checks.indexNow],
        {
          label: "Portrait",
          value: checks.portrait ? "uploaded" : "missing, JSON-LD image omitted",
          attention: !checks.portrait,
        },
        {
          label: "Link preview",
          value: checks.ogImage
            ? "uploaded"
            : checks.portrait
              ? "missing, the portrait stands in"
              : "missing, no link preview image at all",
          attention: !checks.ogImage,
        },
      ],
    },
  ];
}

/** Read-only facts about the running instance, grouped for the admin dashboard. */
export function SystemPanel({ info }: { info: SystemInfo }) {
  return (
    <section aria-labelledby="system-heading" className="mt-14">
      <h2 id="system-heading" className="mono-label text-muted">
        System
      </h2>
      <div className="mt-4 grid gap-x-10 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
        {groups(info).map(({ title, facts }) => (
          <div key={title} className="min-w-0">
            <h3 className="mono-label text-text">{title}</h3>
            <dl className="mt-2 divide-y divide-hairline border-t border-hairline">
              {facts.map(({ label, value, attention }) => (
                <div key={label} className="py-3">
                  <dt className="mono-label text-muted">{label}</dt>
                  <dd
                    className={`mt-1 min-w-0 wrap-anywhere tabular-nums ${attention ? "text-accent" : ""}`}
                  >
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}
