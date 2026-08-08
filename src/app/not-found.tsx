import Link from "next/link";
import { Container, RegisterRule } from "@/components/register";

export default function NotFound() {
  return (
    <>
      <RegisterRule index="404" label="Not Found" />
      <Container className="py-16">
        <h1 className="text-[1.75rem] font-semibold tracking-[-0.01em]">Page not found</h1>
        <p className="mt-4 max-w-[65ch] text-muted">
          The page you are looking for does not exist or has moved.
        </p>
        <p className="mono-label mt-8">
          <Link className="link-underline text-text" href="/">
            ← Back home
          </Link>
        </p>
      </Container>
    </>
  );
}
