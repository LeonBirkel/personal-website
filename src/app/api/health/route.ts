import { prisma } from "@/lib/prisma";

/**
 * Container healthcheck. Reports unhealthy when the database is unreachable,
 * so Docker restarts the app instead of serving errors. Never cached, and
 * excluded from crawling by robots.ts along with the rest of /api.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("health check failed", error);
    return Response.json(
      { status: "error" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
