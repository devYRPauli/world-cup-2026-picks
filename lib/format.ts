import type { MatchRow } from "@/lib/types";

export function isMatchLocked(match: MatchRow) {
  return new Date(match.starts_at).getTime() <= Date.now() || match.status !== "SCHEDULED";
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short"
  }).format(new Date(value));
}

export function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

export function minutesUntil(value: string) {
  return Math.ceil((new Date(value).getTime() - Date.now()) / 60000);
}

export function toTitleCase(value: string | null) {
  if (!value) {
    return "Match";
  }

  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

