import { getCipherStrip } from "@/config/site-config";

/**
 * The footer hex's vertical sibling: a Caesar-ciphered ornament pinned to the
 * right edge on wide screens. Decorative and inert. It is fixed and
 * pointer-events-none, so it never shifts layout or catches a click, and it
 * hides below xl where there is no side margin to spare. Absent unless the
 * instance configures easterEggs.cipherStrip.
 */
export function CipherStrip() {
  const cipher = getCipherStrip();
  if (!cipher) return null;

  return (
    <span
      aria-hidden="true"
      className="pointer-events-none fixed top-1/2 right-2 z-0 hidden -translate-y-1/2 [writing-mode:vertical-rl] font-mono text-[0.65rem] tracking-[0.35em] whitespace-nowrap text-muted opacity-40 select-none xl:block"
    >
      {cipher}
    </span>
  );
}
