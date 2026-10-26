import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Entrar" };

export default function EntrarPage() {
  return (
    <Suspense>
      <AuthForm mode="signin" />
    </Suspense>
  );
}
