import { llmsIndex } from "@/lib/markdown-pages";

export const revalidate = 300;

export async function GET() {
  return new Response(await llmsIndex(), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
