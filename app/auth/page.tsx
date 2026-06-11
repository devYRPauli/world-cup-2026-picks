import { redirect } from "next/navigation";
import { AuthForm } from "@/app/auth/auth-form";
import { getMissingServerEnv, hasPublicSupabaseEnv } from "@/lib/env";
import { getCurrentProfile } from "@/lib/auth";
import { SetupScreen } from "@/components/setup-screen";

export const dynamic = "force-dynamic";

export default async function AuthPage({
  searchParams
}: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  if (!hasPublicSupabaseEnv()) {
    return <SetupScreen missing={getMissingServerEnv()} />;
  }

  const session = await getCurrentProfile();
  if (session) {
    redirect("/");
  }

  const params = await searchParams;

  return (
    <main className="auth-wrap">
      <AuthForm message={params.message} error={params.error} />
    </main>
  );
}
