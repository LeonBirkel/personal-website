import { Container, PageHeader } from "@/components/register";
import { createProjectAction } from "../actions";
import { ProjectForm } from "../project-form";
import { requireAdmin } from "@/lib/admin-session";

export default async function NewProjectPage() {
  await requireAdmin();
  return (
    <>
      <PageHeader index="00" label="Admin" title="New project" />
      <Container className="py-8">
        <ProjectForm action={createProjectAction} />
      </Container>
    </>
  );
}
