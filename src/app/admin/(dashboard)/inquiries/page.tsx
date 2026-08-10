import type { ContactInquiry } from "@/generated/prisma/client";
import { Container, PageHeader } from "@/components/register";
import { requireAdmin } from "@/lib/admin-session";
import { formatDate } from "@/lib/site";
import { listInquiries, listSpamInquiries } from "@/services/contact";
import { deleteAllSpamAction, deleteInquiryAction, markNotSpamAction } from "./actions";

const ACTION_CLASSES = "mono-label link-underline cursor-pointer text-muted";

export default async function AdminInquiriesPage() {
  await requireAdmin();
  const [inquiries, spam] = await Promise.all([listInquiries(), listSpamInquiries()]);

  return (
    <>
      <PageHeader index="00" label="Admin" title="Inquiries" />
      <Container className="py-8">
        {inquiries.length === 0 ? (
          <p className="text-muted">No inquiries yet.</p>
        ) : (
          <ul className="space-y-8">
            {inquiries.map((inquiry) => (
              <InquiryCard key={inquiry.id} inquiry={inquiry} />
            ))}
          </ul>
        )}

        {spam.length > 0 ? (
          <section className="mt-16 border-t border-hairline pt-8">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <h2 className="mono-label text-muted">Filtered as spam ({spam.length})</h2>
              <span className="flex-1" />
              <form action={deleteAllSpamAction}>
                <button type="submit" className={ACTION_CLASSES}>
                  Delete all spam
                </button>
              </form>
            </div>
            <p className="mt-3 max-w-[65ch] text-sm text-muted">
              Kept so nothing is lost to a wrong call. Anything here notified nobody. Use &quot;Not
              spam&quot; to move a message back to the inbox.
            </p>
            <ul className="mt-8 space-y-8 opacity-75">
              {spam.map((inquiry) => (
                <InquiryCard key={inquiry.id} inquiry={inquiry} recoverable />
              ))}
            </ul>
          </section>
        ) : null}
      </Container>
    </>
  );
}

function InquiryCard({
  inquiry,
  recoverable = false,
}: {
  inquiry: ContactInquiry;
  recoverable?: boolean;
}) {
  return (
    <li className="border-b border-hairline pb-6">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
        <span className="font-medium">{inquiry.subject}</span>
        <span className="mono-label text-muted">{formatDate(inquiry.createdAt)}</span>
        <span className="flex-1" />
        {recoverable ? (
          <form action={markNotSpamAction}>
            <input type="hidden" name="id" value={inquiry.id} />
            <button type="submit" className={ACTION_CLASSES}>
              Not spam
            </button>
          </form>
        ) : null}
        <form action={deleteInquiryAction}>
          <input type="hidden" name="id" value={inquiry.id} />
          <button type="submit" className={ACTION_CLASSES}>
            Delete
          </button>
        </form>
      </div>
      <p className="mono-label mt-1 text-muted">
        {inquiry.name} ·{" "}
        <a className="link-underline text-text" href={`mailto:${inquiry.email}`}>
          {inquiry.email}
        </a>
      </p>
      {recoverable && inquiry.spamReasons ? (
        <p className="mono-label mt-1 text-muted">
          score {inquiry.spamScore}: {inquiry.spamReasons}
        </p>
      ) : null}
      <p className="mt-3 max-w-[65ch] whitespace-pre-wrap">{inquiry.message}</p>
    </li>
  );
}
