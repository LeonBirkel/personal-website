import { revalidateEverything } from "@/services/revalidate";

/**
 * Boot-time cache flush, called by docker/entrypoint.sh right after the
 * server is healthy. Guarded by a per-boot token the entrypoint generates,
 * so nothing else can trigger it. Returns 404 when the token env is absent
 * (dev servers do not need it).
 */
export async function POST(request: Request) {
  const token = process.env.BOOT_REVALIDATE_TOKEN;
  if (!token) {
    return new Response("Not found", { status: 404 });
  }
  if (request.headers.get("x-boot-token") !== token) {
    return new Response("Unauthorized", { status: 401 });
  }
  await revalidateEverything();
  return new Response(null, { status: 204 });
}
