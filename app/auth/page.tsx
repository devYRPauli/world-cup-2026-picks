import { redirect } from "next/navigation";
import { AuthForm } from "@/app/auth/auth-form";
import { getMissingServerEnv, getPoolInviteCode, hasPublicSupabaseEnv } from "@/lib/env";
import { getCurrentProfile } from "@/lib/auth";
import { SetupScreen } from "@/components/setup-screen";
import { ThemeToggle } from "@/components/theme-toggle";

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
    <main className="center-wrap">
      <div className="float-toggle">
        <ThemeToggle />
      </div>
      <AuthForm message={params.message} error={params.error} inviteRequired={Boolean(getPoolInviteCode())} />
    </main>
  );
}
