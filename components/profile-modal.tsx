"use client";

import { useEffect } from "react";
import { Crosshair, Flame, Target, Trophy, X } from "lucide-react";
import type { ProfileStats } from "@/lib/types";

export function ProfileModal({
  stats,
  isCurrentUser,
  onClose
}: {
  stats: ProfileStats | null;
  isCurrentUser: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!stats) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [stats, onClose]);

  if (!stats) {
    return null;
  }

  return (
    <div className="modal-scrim on" onClick={onClose} role="presentation">
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={`${stats.display_name} stats`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <div className="who">
            <span className="av" style={{ background: stats.avatar_color }}>
              {initials(stats.display_name)}
            </span>
            <div style={{ minWidth: 0 }}>
              <span className="nm">
                {stats.display_name}
                {isCurrentUser ? " (you)" : ""}
              </span>
              <span className="sub">Rank #{stats.rank}</span>
            </div>
          </div>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="modal-points">
          <span className="tnum">{stats.points}</span>
          <small>POINTS</small>
        </div>

        <div className="stat-grid">
          <StatTile
            icon={<Target size={16} />}
            value={`${stats.correct}/${stats.decided}`}
            label="Correct picks"
          />
          <StatTile icon={<Crosshair size={16} />} value={`${stats.accuracy}%`} label="Accuracy" />
          <StatTile
            icon={<Flame size={16} />}
            value={`${stats.current_streak}`}
            label={`Streak (best ${stats.best_streak})`}
          />
          <StatTile
            icon={<Crosshair size={16} />}
            value={`${stats.exact_scores}`}
            label="Exact scorelines"
          />
          <StatTile icon={<Trophy size={16} />} value={`${stats.group_points}`} label="Group bonus pts" />
          <StatTile icon={<Target size={16} />} value={`${stats.picks}`} label="Picks made" />
        </div>
      </div>
    </div>
  );
}

function StatTile({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="stat-tile">
      <span className="ico" aria-hidden="true">
        {icon}
      </span>
      <span className="tv tnum">{value}</span>
      <span className="tl">{label}</span>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
