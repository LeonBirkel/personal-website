import { Container, PageHeader } from "@/components/register";
import { createNewsAction } from "../actions";
import { NewsForm } from "../news-form";
import { requireAdmin } from "@/lib/admin-session";

export default async function NewNewsPage() {
  await requireAdmin();
  return (
    <>
      <PageHeader index="00" label="Admin" title="New news item" />
      <Container className="py-8">
        <NewsForm action={createNewsAction} />
      </Container>
    </>
  );
}
