import { Container, PageHeader } from "@/components/register";
import { createPublicationAction } from "../actions";
import { getSiteConfig } from "@/config/site-config";
import { PublicationForm } from "../publication-form";
import { requireAdmin } from "@/lib/admin-session";

export default async function NewPublicationPage() {
  await requireAdmin();
  return (
    <>
      <PageHeader index="00" label="Admin" title="New publication" />
      <Container className="py-8">
        <PublicationForm
          action={createPublicationAction}
          personName={getSiteConfig().person.name}
        />
      </Container>
    </>
  );
}
