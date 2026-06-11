"use client";

import { useState } from "react";
import { LogIn, Mail, UserPlus } from "lucide-react";
import { signInAction, signUpAction } from "@/app/auth/actions";

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
        <span className="brand-mark" aria-hidden="true">
          <UserPlus size={23} />
        </span>
        <span>
          <h1>Lab Cup</h1>
          <p>Sign in to make your picks.</p>
        </span>
      </div>

      {message ? <div className="notice">{message}</div> : null}
      {error ? <div className="notice error">{error}</div> : null}

      <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
        <button
          className={`auth-tab ${!isSignup ? "active" : ""}`}
          onClick={() => setMode("signin")}
          type="button"
        >
          Sign in
        </button>
        <button
          className={`auth-tab ${isSignup ? "active" : ""}`}
          onClick={() => setMode("signup")}
          type="button"
        >
          Join
        </button>
      </div>

      <form action={isSignup ? signUpAction : signInAction} className="auth-form">
        {isSignup ? (
          <>
            <div className="field">
              <label htmlFor="display_name">Name</label>
              <input id="display_name" name="display_name" placeholder="Your leaderboard name" required />
            </div>
            <div className="field">
              <label htmlFor="invite_code">Lab code</label>
              <input id="invite_code" name="invite_code" placeholder="Shared invite code" />
            </div>
          </>
        ) : null}
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" placeholder="you@lab.edu" required type="email" />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" minLength={8} name="password" required type="password" />
        </div>
        <button className="button primary" type="submit">
          {isSignup ? <Mail size={17} /> : <LogIn size={17} />}
          {isSignup ? "Send confirmation" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
