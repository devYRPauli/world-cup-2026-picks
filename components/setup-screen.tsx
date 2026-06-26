import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";

export function SetupScreen({ missing }: { missing: string[] }) {
  return (
    <main className="center-wrap">
      <div className="float-toggle">
        <ThemeToggle />
      </div>
      <section className="setup-panel">
        <div className="brand">
          <span className="mark" aria-hidden="true">
            <BrandLogo />
          </span>
          <span>
            <span className="t1">World Cup 2026 Picks</span>
          </span>
        </div>
        <h1>Finish the setup</h1>
        <p className="lede">Add your Supabase credentials to start the pool.</p>

        <div className="setup-grid">
          <div className="stack">
            <p style={{ margin: 0, color: "var(--muted)" }}>
              Missing environment variables:
            </p>
            <p style={{ margin: 0, fontWeight: 700 }}>{missing.join(", ")}</p>
            <div className="code-block">
              <pre>{`cp .env.example .env.local
npm install
npm run dev`}</pre>
            </div>
          </div>

          <div className="card">
            <div className="card-top">
              <div className="meta">
                <span>Group A</span>
                <span className="dot">/</span>
                <span>Matchday 1</span>
              </div>
              <span className="pill open">Open</span>
            </div>
            <div className="card-body">
              <div className="teams">
                <div className="team">
                  <span className="flag">MEX</span>
                  <span className="team-name">Mexico</span>
                </div>
                <div className="vs">
                  <div className="score">vs</div>
                  <div className="lbl">pick</div>
                </div>
                <div className="team away">
                  <span className="team-name">S. Africa</span>
                  <span className="flag">RSA</span>
                </div>
              </div>
              <div className="lockedrow">Bragging rights only. No money, no odds.</div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
