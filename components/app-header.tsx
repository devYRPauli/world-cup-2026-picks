"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Home, LayoutGrid, LogOut, Menu, ShieldCheck, Trophy, X } from "lucide-react";
import { signOutAction } from "@/app/auth/actions";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import type { ProfileRow } from "@/lib/types";

export type DashboardView = "matches" | "groups" | "leaderboard";
type NavKey = "home" | "groups" | "leaderboard" | "admin";

const NAV: { key: NavKey; label: string; href: string; view: DashboardView; icon: typeof Home }[] = [
  { key: "home", label: "Home", href: "/", view: "matches", icon: Home },
  { key: "groups", label: "Groups", href: "/?tab=groups", view: "groups", icon: LayoutGrid },
  { key: "leaderboard", label: "Leaderboard", href: "/?tab=leaderboard", view: "leaderboard", icon: Trophy }
];

export function AppHeader({
  profile,
  active,
  onNavigate
}: {
  profile: ProfileRow;
  active?: NavKey;
  onNavigate?: (view: DashboardView) => void;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const isAdmin = profile.role === "admin";

  function handleNav(view: DashboardView) {
    setOpen(false);
    onNavigate?.(view);
  }

  return (
    <>
      <header className="topbar">
        {onNavigate ? (
          <button className="brand brand-btn" type="button" onClick={() => handleNav("matches")}>
            <BrandMark />
          </button>
        ) : (
          <Link className="brand" href="/" onClick={() => setOpen(false)}>
            <BrandMark />
          </Link>
        )}

        <nav className="nav" aria-label="Primary">
          {NAV.map((item) =>
            onNavigate ? (
              <button
                key={item.key}
                type="button"
                className={`navbtn ${active === item.key ? "active" : ""}`}
                onClick={() => handleNav(item.view)}
              >
                {item.label}
              </button>
            ) : (
              <Link key={item.key} href={item.href} className={active === item.key ? "active" : ""}>
                {item.label}
              </Link>
            )
          )}
          {isAdmin ? (
            <Link href="/admin" className={active === "admin" ? "active" : ""}>
              Admin
            </Link>
          ) : null}
          <span className="sep" aria-hidden="true" />
          <ThemeToggle />
          <form action={signOutAction}>
            <button className="icon-btn danger" type="submit" title="Sign out" aria-label="Sign out">
              <LogOut size={18} />
            </button>
          </form>
        </nav>

        <div className="bar-actions">
          <ThemeToggle />
          <button
            className="hamburger"
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            aria-expanded={open}
          >
            <Menu size={22} />
          </button>
        </div>
      </header>

      <div className={`scrim ${open ? "on" : ""}`} onClick={() => setOpen(false)} aria-hidden="true" />
      <nav className={`drawer ${open ? "on" : ""}`} aria-label="Menu" aria-hidden={!open}>
        <div className="dhead">
          <span className="brand">
            <BrandMark />
          </span>
          <button className="icon-btn" type="button" onClick={() => setOpen(false)} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        {NAV.map((item) => {
          const Icon = item.icon;
          const className = active === item.key ? "active" : "";
          return onNavigate ? (
            <button key={item.key} type="button" className={`navbtn ${className}`} onClick={() => handleNav(item.view)}>
              <Icon size={18} />
              {item.label}
            </button>
          ) : (
            <Link key={item.key} href={item.href} className={className} onClick={() => setOpen(false)}>
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
        {isAdmin ? (
          <Link href="/admin" className={active === "admin" ? "active" : ""} onClick={() => setOpen(false)}>
            <ShieldCheck size={18} />
            Admin
          </Link>
        ) : null}

        <div className="spacer" />
        <form action={signOutAction}>
          <button className="btn danger block" type="submit">
            <LogOut size={18} />
            Sign out
          </button>
        </form>
      </nav>
    </>
  );
}

function BrandMark() {
  return (
    <>
      <BrandLogo />
      <span className="t1">World Cup 2026 Picks</span>
    </>
  );
}
