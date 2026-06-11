"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

export function SubmitButton({
  children,
  pendingLabel = "Saving...",
  className = "",
  icon
}: {
  children: ReactNode;
  pendingLabel?: string;
  className?: string;
  icon?: ReactNode;
}) {
  const { pending } = useFormStatus();

  return (
    <button className={`btn ${className}`} type="submit" disabled={pending} aria-busy={pending}>
      {pending ? <span className="spinner" aria-hidden="true" /> : icon}
      {pending ? pendingLabel : children}
    </button>
  );
}
