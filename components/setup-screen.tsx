import { Trophy } from "lucide-react";

export function SetupScreen({ missing }: { missing: string[] }) {
  return (
    <main className="setup-wrap">
      <section className="setup-panel">
        <div className="setup-grid">
          <div>
            <div className="brand">
              <span className="brand-mark" aria-hidden="true">
                <Trophy size={24} />
              </span>
              <span>
                <h1>Lab Cup</h1>
                <p>Finish the Supabase setup to start the pool.</p>
              </span>
            </div>
            <p>
              Missing environment variables: <strong>{missing.join(", ")}</strong>
            </p>
            <div className="code-block">
              <pre>{`cp .env.example .env.local
npm install
npm run dev`}</pre>
            </div>
          </div>
          <div className="match-list">
            <article className="match-card">
              <div className="match-topline">
                <div className="match-meta">
                  <span>Group A</span>
                  <span>Matchday 1</span>
                </div>
                <span className="status-pill">Open</span>
              </div>
              <div className="match-body">
                <div className="teams">
                  <div className="team">
                    <span className="badge">MEX</span>
                    <span className="team-name">Mexico</span>
                  </div>
                  <div className="score-box">
                    vs
                    <span>pick</span>
                  </div>
                  <div className="team away">
                    <span className="team-name">South Africa</span>
                    <span className="badge">RSA</span>
                  </div>
                </div>
                <div className="saved-pick">Bragging rights only. No money, no odds.</div>
              </div>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}

