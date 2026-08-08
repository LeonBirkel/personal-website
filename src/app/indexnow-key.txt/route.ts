/**
 * IndexNow key file, reached via the proxy rewrite of /<INDEXNOW_KEY>.txt.
 * The handler still sees the original request URL, so it can require that
 * the caller actually asked for /<key>.txt. A direct hit on this fixed path
 * must 404: it is identical on every instance, so answering it would hand
 * the key to anyone who knows the framework.
 */
export async function GET(request: Request) {
  const key = process.env.INDEXNOW_KEY;
  if (!key || new URL(request.url).pathname !== `/${key}.txt`) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(key, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
