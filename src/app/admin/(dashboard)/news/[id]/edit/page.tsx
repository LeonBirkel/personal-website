import { notFound } from "next/navigation";
import { Container, PageHeader } from "@/components/register";
import { getNewsItemById } from "@/services/news";
import { updateNewsAction } from "../../actions";
import { NewsForm } from "../../news-form";
import { requireAdmin } from "@/lib/admin-session";

export default async function EditNewsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const item = await getNewsItemById(id);
  if (!item) notFound();

  const action = updateNewsAction.bind(null, item.id);

  return (
    <>
      <PageHeader index="00" label="Admin" title="Edit news item" />
      <Container className="py-8">
        <NewsForm action={action} item={item} />
      </Container>
    </>
  );
}
