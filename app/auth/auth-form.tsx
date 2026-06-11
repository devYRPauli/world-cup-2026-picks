"use client";

import { useState } from "react";
import { LogIn, UserPlus } from "lucide-react";
import { signInAction, signUpAction } from "@/app/auth/actions";
import { SubmitButton } from "@/components/submit-button";

export function AuthForm({
  message,
  error
}: {
  message?: string;
  error?: string;
}) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const isSignup = mode === "signup";

  return (
    <div className="auth-panel">
      <div className="brand">
        <span className="mark" aria-hidden="true">26</span>
        <span>
          <span className="t1">World Cup 2026 Picks</span>
        </span>
      </div>
      <h1>{isSignup ? "Join the pool" : "Welcome back"}</h1>
      <p className="lede">{isSignup ? "Create an account and start picking right away." : "Sign in to make your picks."}</p>

      {message ? <div className="notice" style={{ marginTop: 18 }}>{message}</div> : null}
      {error ? <div className="notice error" style={{ marginTop: 18 }}>{error}</div> : null}

      <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
        <button
          className={`auth-tab ${!isSignup ? "active" : ""}`}
          onClick={() => setMode("signin")}
          type="button"
          role="tab"
          aria-selected={!isSignup}
        >
          Sign in
        </button>
        <button
          className={`auth-tab ${isSignup ? "active" : ""}`}
          onClick={() => setMode("signup")}
          type="button"
          role="tab"
          aria-selected={isSignup}
        >
          Join
        </button>
      </div>

      <form action={isSignup ? signUpAction : signInAction} className="stack">
        {isSignup ? (
          <>
            <div className="field">
              <label htmlFor="display_name">Name</label>
              <input id="display_name" name="display_name" placeholder="Your leaderboard name" required />
            </div>
            <div className="field">
              <label htmlFor="invite_code">Invite code</label>
              <input id="invite_code" name="invite_code" placeholder="Shared invite code" />
            </div>
          </>
        ) : null}
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" placeholder="you@example.com" required type="email" />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" minLength={8} name="password" required type="password" />
        </div>
        <SubmitButton
          className="block"
          pendingLabel={isSignup ? "Creating account..." : "Signing in..."}
          icon={isSignup ? <UserPlus size={17} /> : <LogIn size={17} />}
        >
          {isSignup ? "Create account & sign in" : "Sign in"}
        </SubmitButton>
      </form>
    </div>
  );
}
