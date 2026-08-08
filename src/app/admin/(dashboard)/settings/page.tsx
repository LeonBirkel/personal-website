import { Container, PageHeader } from "@/components/register";
import { DISCORD_WEBHOOK_KEY } from "@/services/notifications";
import { listSettings } from "@/services/settings";
import { NotificationForm } from "./notification-form";
import { SettingForm } from "./setting-form";
import { UploadWidget } from "./upload-widget";
import { requireAdmin } from "@/lib/admin-session";

export default async function AdminSettingsPage() {
  await requireAdmin();
  const settings = await listSettings();
  const webhookUrl = settings.find(({ key }) => key === DISCORD_WEBHOOK_KEY)?.value ?? "";

  return (
    <>
      <PageHeader index="00" label="Admin" title="Settings" />
      <Container className="py-8">
        <section aria-labelledby="uploads-heading">
          <h2 id="uploads-heading" className="mono-label text-muted">
            Uploads
          </h2>
          <p className="mt-2 max-w-[65ch] text-muted">
            Two images matter here. Upload the portrait as portrait.jpg, a square or portrait crop,
            which becomes the JSON-LD image. Upload the link preview as og-image.jpg at 1200×630,
            which becomes the og:image shown when the site is shared. Without the second one the
            portrait stands in, and platforms that crop to 2:1 will cut the head. Publication PDFs
            work the same way: upload, then reference the returned /uploads/… URL.
          </p>
          <div className="mt-4">
            <UploadWidget />
          </div>
        </section>

        <section aria-labelledby="notifications-heading" className="mt-14">
          <h2 id="notifications-heading" className="mono-label text-muted">
            Notifications
          </h2>
          <p className="mt-2 max-w-[65ch] text-muted">
            Every new contact inquiry can post a message to a Discord channel. Create a webhook in
            your server (Server Settings → Integrations → Webhooks), paste its URL here and save.
            The test button sends a hello to the channel so you can confirm the wiring.
          </p>
          <div className="mt-4">
            <NotificationForm webhookUrl={webhookUrl} />
          </div>
        </section>

        <section aria-labelledby="settings-heading" className="mt-14">
          <h2 id="settings-heading" className="mono-label text-muted">
            Key-value settings
          </h2>
          {settings.length > 0 ? (
            <ul className="mt-4 max-w-[42rem] space-y-2">
              {settings.map(({ key, value }) => (
                <li key={key} className="flex gap-5 border-b border-hairline py-2">
                  <code className="mono-label shrink-0 text-muted">{key}</code>
                  <span className="min-w-0 break-all">{value}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-muted">No settings stored yet.</p>
          )}
          <div className="mt-6">
            <SettingForm />
          </div>
        </section>
      </Container>
    </>
  );
}
