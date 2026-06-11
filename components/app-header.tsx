import Link from "next/link";
import { Gauge, LogOut, ShieldCheck, Trophy } from "lucide-react";
import { signOutAction } from "@/app/auth/actions";
import type { ProfileRow } from "@/lib/types";

export function AppHeader({ profile }: { profile: ProfileRow }) {
  return (
    <header className="topbar">
      <Link className="brand" href="/">
        <span className="brand-mark" aria-hidden="true">
          <Trophy size={24} />
        </span>
        <span>
          <h1>World Cup 2026 Picks</h1>
          <p>Match picks, group picks, and live points</p>
        </span>
      </Link>
      <nav className="topbar-actions" aria-label="Main navigation">
        <Link className="button" href="/" title="Dashboard">
          <Gauge size={18} />
          Dashboard
        </Link>
        {profile.role === "admin" ? (
          <Link className="button" href="/admin" title="Admin tools">
            <ShieldCheck size={18} />
            Admin
          </Link>
        ) : null}
        <form action={signOutAction}>
          <button className="icon-button" title="Sign out" type="submit">
            <LogOut size={18} />
          </button>
        </form>
      </nav>
    </header>
  );
}
