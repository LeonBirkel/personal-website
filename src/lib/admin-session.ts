import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * RBAC gate for admin pages and every admin server action. The proxy only
 * checks cookie presence; this validates the session and the role.
 */
export async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || role !== "admin") redirect("/admin/login");
  return session;
}
