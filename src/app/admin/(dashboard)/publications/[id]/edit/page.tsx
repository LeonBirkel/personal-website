import { notFound } from "next/navigation";
import { Container, PageHeader } from "@/components/register";
import { getPublicationById } from "@/services/publications";
import { updatePublicationAction } from "../../actions";
import { getSiteConfig } from "@/config/site-config";
import { PublicationForm } from "../../publication-form";
import { requireAdmin } from "@/lib/admin-session";

export default async function EditPublicationPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const publication = await getPublicationById(id);
  if (!publication) notFound();

  const action = updatePublicationAction.bind(null, publication.id);

  return (
    <>
      <PageHeader index="00" label="Admin" title="Edit publication" />
      <Container className="py-8">
        <PublicationForm
          action={action}
          personName={getSiteConfig().person.name}
          publication={publication}
        />
      </Container>
    </>
  );
}
