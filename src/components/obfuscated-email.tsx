"use client";

import { useState } from "react";

/**
 * Crawl-protected email display. The server passes the address base64-encoded
 * and reversed, and it is decoded only on user interaction. The plain address
 * never appears in server-rendered HTML, the RSC payload, or any markdown
 * mirror, and even JavaScript-running scrapers would have to click first.
 */
export function ObfuscatedEmail({ encoded }: { encoded: string }) {
  const [email, setEmail] = useState<string | null>(null);

  if (!email) {
    return (
      <button
        type="button"
        onClick={() => setEmail(atob(encoded.split("").reverse().join("")))}
        className="mono-label cursor-pointer border border-hairline bg-surface px-5 py-3 text-text hover:border-accent"
      >
        Click to reveal the address
      </button>
    );
  }

  return (
    <a
      className="link-underline font-mono text-[clamp(1.25rem,3.5vw,1.75rem)] font-medium break-all"
      href={`mailto:${email}`}
    >
      {email}
    </a>
  );
}
