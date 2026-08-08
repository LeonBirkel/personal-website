import type { Graph } from "schema-dts";

/** Renders a JSON-LD graph; < is escaped so content can never close the script tag. */
export function JsonLd({ data }: { data: Graph }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
