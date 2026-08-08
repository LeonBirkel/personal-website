import type { Metadata } from "next";
import { Container, RegisterRule } from "@/components/register";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Admin login",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <>
      <RegisterRule index="00" label="Admin" />
      <Container className="py-16">
        <h1 className="text-[1.75rem] font-semibold tracking-[-0.01em]">Sign in</h1>
        <div className="mt-8">
          <LoginForm />
        </div>
      </Container>
    </>
  );
}
