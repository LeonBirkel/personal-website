"use client";

import { useState } from "react";
import { INPUT_CLASSES } from "@/components/admin/form-controls";

export function UploadWidget() {
  const [result, setResult] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setPending(true);
    setError(undefined);
    setResult(undefined);
    try {
      const response = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        setError(data.error ?? "Upload failed");
      } else {
        setResult(data.url);
      }
    } catch {
      setError("Upload failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-[42rem] space-y-4">
      <label className="mono-label block text-muted" htmlFor="file">
        Upload file (jpg, png, webp, pdf, bib, txt, max 20 MB)
      </label>
      <input className={INPUT_CLASSES} type="file" id="file" name="file" required />
      <button
        type="submit"
        disabled={pending}
        className="mono-label cursor-pointer border border-hairline bg-text px-6 py-3 text-bg hover:bg-accent disabled:opacity-60"
      >
        {pending ? "Uploading…" : "Upload"}
      </button>
      {result ? (
        <p role="status">
          Uploaded: <code className="font-mono text-sm">{result}</code>
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-accent">
          {error}
        </p>
      ) : null}
    </form>
  );
}
