import type { ReactNode } from "react";

/** Full-bleed hairline with a mono register label. Every section boundary uses this. */
export function RegisterRule({ index, label }: { index?: string; label: string }) {
  return (
    <div className="border-t border-hairline">
      <div className="mx-auto max-w-(--container-max) px-6 pt-3 md:px-10">
        <p className="mono-label text-muted">
          {index ? <span className="text-text">{index} / </span> : null}
          {label}
        </p>
      </div>
    </div>
  );
}

/** Centered content column shared by all pages. */
export function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto max-w-(--container-max) px-6 md:px-10 ${className}`}>{children}</div>
  );
}

/** Page header for subpages: register rule + h1. */
export function PageHeader({
  index,
  label,
  title,
  children,
}: {
  index: string;
  label: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <>
      <RegisterRule index={index} label={label} />
      <Container className="pt-10 pb-4 md:pt-14">
        <h1 className="text-[1.75rem] leading-tight font-semibold tracking-[-0.01em]">{title}</h1>
        {children}
      </Container>
    </>
  );
}

/** Ledger row: fixed mono date column against a shared vertical hairline. */
export function LedgerRow({
  left,
  children,
  id,
}: {
  left: ReactNode;
  children: ReactNode;
  id?: string;
}) {
  return (
    <div id={id} className="grid scroll-mt-20 gap-y-1 md:grid-cols-[160px_1fr] md:gap-x-10">
      <p className="mono-label pt-1 text-muted">{left}</p>
      <div className="border-hairline md:border-l md:pl-10">{children}</div>
    </div>
  );
}
