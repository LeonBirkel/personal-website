import { notFound } from "next/navigation";
import { Container, PageHeader } from "@/components/register";
import { getProjectById } from "@/services/projects";
import { updateProjectAction } from "../../actions";
import { ProjectForm } from "../../project-form";
import { requireAdmin } from "@/lib/admin-session";

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const project = await getProjectById(id);
  if (!project) notFound();

  const action = updateProjectAction.bind(null, project.id);

  return (
    <>
      <PageHeader index="00" label="Admin" title="Edit project" />
      <Container className="py-8">
        <ProjectForm action={action} project={project} />
      </Container>
    </>
  );
}
