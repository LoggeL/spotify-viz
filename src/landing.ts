import "./styles.css";

interface UserMeta { id: string; display: string; }

const USERS: UserMeta[] = [
  { id: "logge", display: "logge" },
  { id: "tojokn", display: "tojokn" },
  { id: "jonas", display: "jonas" },
  { id: "noel", display: "noel" },
];

interface Totals {
  totalPlays: number;
  totalMs: number;
  uniqueArtists: number;
  uniqueTracks: number;
  firstPlay: string;
  lastPlay: string;
  years: string[];
}

function fmtNum(n: number): string { return n.toLocaleString("de-DE"); }
function fmtHours(ms: number): string {
  const h = ms / 3600_000;
  if (h >= 1000) return `${(h / 1000).toFixed(1)}k h`;
  if (h >= 1) return `${h.toFixed(0)} h`;
  return `${(ms / 60_000).toFixed(0)} min`;
}

async function main() {
  const app = document.querySelector<HTMLDivElement>("#app")!;
  app.innerHTML = `
    <header class="landing-head">
      <h1>Spotify Listening Report</h1>
      <p class="lead">data-driven visualisierungen einer persönlichen Spotify Extended Streaming History.<br/>kein OAuth, kein server, kein tracking — alles lokal aus dem Spotify-exportzip aggregiert.</p>
    </header>
    <div class="landing-grid" id="grid"></div>
    <section class="landing-about">
      <h2>Was drin ist</h2>
      <p>40+ viz: top artists/tracks/albums, listening clock, calendar heatmap, genre trees &amp; streams, skip-behavior, artist loyalty, geographic origin, session lengths, and more. Each report is generated from the "Extended streaming history" ZIP (Spotify → Privacy → Download your data).</p>
      <p>Source on <a href="https://github.com/LoggeL/spotify-viz">GitHub</a>.</p>
    </section>
    <footer>local-only · processed from Spotify Extended Streaming History</footer>
  `;

  const grid = app.querySelector<HTMLDivElement>("#grid")!;
  const base = import.meta.env.BASE_URL;

  await Promise.all(USERS.map(async (u) => {
    const card = document.createElement("a");
    card.className = "user-card";
    card.href = `${base}${u.id}/`;
    card.innerHTML = `
      <div class="uc-head">
        <div class="uc-name">${u.display}</div>
        <div class="uc-arrow">→</div>
      </div>
      <div class="uc-body"><div class="uc-loading">loading…</div></div>
    `;
    grid.appendChild(card);
    try {
      const res = await fetch(`${base}${u.id}/data.json`);
      if (!res.ok) throw new Error(String(res.status));
      const d = await res.json() as { totals: Totals };
      const t = d.totals;
      const body = card.querySelector<HTMLDivElement>(".uc-body")!;
      body.innerHTML = `
        <dl class="uc-stats">
          <div><dt>plays</dt><dd>${fmtNum(t.totalPlays)}</dd></div>
          <div><dt>hours</dt><dd>${fmtHours(t.totalMs)}</dd></div>
          <div><dt>artists</dt><dd>${fmtNum(t.uniqueArtists)}</dd></div>
          <div><dt>tracks</dt><dd>${fmtNum(t.uniqueTracks)}</dd></div>
        </dl>
        <div class="uc-range">${t.firstPlay.slice(0, 10)} → ${t.lastPlay.slice(0, 10)}  ·  ${t.years.length} jahre</div>
      `;
    } catch (e) {
      card.querySelector<HTMLDivElement>(".uc-body")!.innerHTML =
        `<div class="uc-loading">failed: ${(e as Error).message}</div>`;
    }
  }));
}

main();
