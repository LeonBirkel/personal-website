import { llmsFull } from "@/lib/markdown-pages";

export const revalidate = 300;

export async function GET() {
  return new Response(await llmsFull(), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
