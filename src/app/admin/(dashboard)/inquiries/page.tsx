import { Container, PageHeader } from "@/components/register";
import { formatDate } from "@/lib/site";
import { listInquiries } from "@/services/contact";
import { deleteInquiryAction } from "./actions";
import { requireAdmin } from "@/lib/admin-session";

export default async function AdminInquiriesPage() {
  await requireAdmin();
  const inquiries = await listInquiries();

  return (
    <>
      <PageHeader index="00" label="Admin" title="Inquiries" />
      <Container className="py-8">
        {inquiries.length === 0 ? (
          <p className="text-muted">No inquiries yet.</p>
        ) : (
          <ul className="space-y-8">
            {inquiries.map((inquiry) => (
              <li key={inquiry.id} className="border-b border-hairline pb-6">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                  <span className="font-medium">{inquiry.subject}</span>
                  <span className="mono-label text-muted">{formatDate(inquiry.createdAt)}</span>
                  <span className="flex-1" />
                  <form action={deleteInquiryAction}>
                    <input type="hidden" name="id" value={inquiry.id} />
                    <button
                      type="submit"
                      className="mono-label link-underline cursor-pointer text-muted"
                    >
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
                <p className="mt-3 max-w-[65ch] whitespace-pre-wrap">{inquiry.message}</p>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </>
  );
}
