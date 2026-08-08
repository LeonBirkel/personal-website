import { readFileSync, writeFileSync } from "node:fs";
import { z } from "zod";
import { siteConfigSchema } from "../src/config/site-config-schema";

/**
 * Emits site.config.schema.json from the Zod schema so editors autocomplete
 * the config via its $schema pointer. Run `npm run schema` after changing
 * src/config/site-config-schema.ts; CI runs `--check` to catch drift.
 */

const OUTPUT_PATH = "site.config.schema.json";

const jsonSchema = z.toJSONSchema(siteConfigSchema, {
  io: "input",
  // z.coerce.date() has no JSON Schema input representation; "any" is fine
  // for editor tooling, the real validation is the Zod parse at runtime.
  unrepresentable: "any",
});
const output = `${JSON.stringify(jsonSchema, null, 2)}\n`;

if (process.argv.includes("--check")) {
  let existing = "";
  try {
    existing = readFileSync(OUTPUT_PATH, "utf8");
  } catch {
    // missing file falls through to the mismatch error below
  }
  if (existing !== output) {
    console.error(`${OUTPUT_PATH} is out of sync with src/config/site-config-schema.ts.`);
    console.error("Run: npm run schema");
    process.exit(1);
  }
  console.log(`${OUTPUT_PATH} is in sync`);
} else {
  writeFileSync(OUTPUT_PATH, output);
  console.log(`wrote ${OUTPUT_PATH}`);
}
