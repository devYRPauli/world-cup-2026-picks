import { redirect } from "next/navigation";
import { RefreshCcw } from "lucide-react";
import { syncMatchesAction } from "@/app/admin/actions";
import { AppHeader } from "@/components/app-header";
import { AdminResultForm } from "@/components/admin-result-form";
import { SetupScreen } from "@/components/setup-screen";
import { SubmitButton } from "@/components/submit-button";
import { getMissingServerEnv, hasServerSupabaseEnv } from "@/lib/env";
import { requireCurrentProfile } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { MatchRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams
}: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  if (!hasServerSupabaseEnv()) {
    return <SetupScreen missing={getMissingServerEnv()} />;
  }

  const session = await requireCurrentProfile();
  if (!session.profile || session.profile.role !== "admin") {
    redirect("/");
  }

  const params = await searchParams;
  const supabase = getSupabaseAdminClient();
  const { data: matches, error } = await supabase
    .from("matches")
    .select("*")
    .order("starts_at", { ascending: true })
    .returns<MatchRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return (
    <main className="shell">
      <AppHeader profile={session.profile} active="admin" />
      <div className="page-head">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Match control</h1>
        </div>
        <form action={syncMatchesAction}>
          <SubmitButton pendingLabel="Syncing..." icon={<RefreshCcw size={17} />}>
            Sync fixtures
          </SubmitButton>
        </form>
      </div>

      {params.message ? <div className="notice">{params.message}</div> : null}
      {params.error ? <div className="notice error">{params.error}</div> : null}

      <section className="admin-list" aria-label="Matches">
        {matches?.length ? (
          matches.map((match) => <AdminResultForm key={match.id} match={match} />)
        ) : (
          <div className="empty-state">No matches yet. Sync fixtures after adding FOOTBALL_DATA_TOKEN.</div>
        )}
      </section>
    </main>
  );
}
