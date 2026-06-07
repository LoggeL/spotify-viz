import "./styles.css";
import { fmtHours, fmtNum } from "./lib/data";

type DominoEdge = { a: string; t: string; plays: number; ms: number };
type DominoData = {
  generatedAt: string;
  source: string;
  stats: Record<string, number>;
  artists: { key: string; name: string }[];
  titles: { key: string; title: string; artists: number }[];
  edges: DominoEdge[];
};

type ChainStep = {
  artistKey: string;
  artist: string;
  titleKey: string;
  title: string;
  plays: number;
  ms: number;
};

const app = document.querySelector<HTMLDivElement>("#app")!;

function spotifySearchUrl(query: string): string {
  return `https://open.spotify.com/search/${encodeURIComponent(query)}`;
}

function pick<T>(rows: T[]): T {
  return rows[Math.floor(Math.random() * rows.length)];
}

async function loadDominoData(): Promise<DominoData> {
  const base = import.meta.env.BASE_URL;
  const res = await fetch(`${base}julian/song-domino.json`);
  if (!res.ok) throw new Error(`song-domino.json fetch failed: ${res.status}`);
  return await res.json() as DominoData;
}

function buildLookups(data: DominoData) {
  const artistName = new Map(data.artists.map((artist) => [artist.key, artist.name]));
  const titleName = new Map(data.titles.map((title) => [title.key, title.title]));
  const byArtist = new Map<string, DominoEdge[]>();
  const byTitle = new Map<string, DominoEdge[]>();
  for (const edge of data.edges) {
    if (!byArtist.has(edge.a)) byArtist.set(edge.a, []);
    byArtist.get(edge.a)!.push(edge);
    if (!byTitle.has(edge.t)) byTitle.set(edge.t, []);
    byTitle.get(edge.t)!.push(edge);
  }
  return { artistName, titleName, byArtist, byTitle };
}

function weightedPick(edges: DominoEdge[]): DominoEdge {
  const total = edges.reduce((sum, edge) => sum + Math.sqrt(edge.plays), 0);
  let r = Math.random() * total;
  for (const edge of edges) {
    r -= Math.sqrt(edge.plays);
    if (r <= 0) return edge;
  }
  return edges[edges.length - 1];
}

function generateChain(data: DominoData, targetLength: number, startArtist?: string): ChainStep[] {
  const { artistName, titleName, byArtist, byTitle } = buildLookups(data);
  const strongStarts = [...byArtist.entries()].filter(([, edges]) => edges.length >= 2).map(([artist]) => artist);
  let currentArtist = startArtist && byArtist.has(startArtist) ? startArtist : pick(strongStarts);
  const chain: ChainStep[] = [];
  const usedEdges = new Set<string>();

  for (let i = 0; i < targetLength; i += 1) {
    const options = (byArtist.get(currentArtist) ?? []).filter((edge) => !usedEdges.has(`${edge.a}\u0000${edge.t}`));
    if (!options.length) break;
    const edge = weightedPick(options);
    usedEdges.add(`${edge.a}\u0000${edge.t}`);
    chain.push({
      artistKey: edge.a,
      artist: artistName.get(edge.a) ?? edge.a,
      titleKey: edge.t,
      title: titleName.get(edge.t) ?? edge.t,
      plays: edge.plays,
      ms: edge.ms,
    });

    const nextOptions = (byTitle.get(edge.t) ?? [])
      .filter((next) => next.a !== edge.a)
      .filter((next) => (byArtist.get(next.a) ?? []).some((candidate) => candidate.t !== edge.t));
    if (!nextOptions.length) break;
    currentArtist = weightedPick(nextOptions).a;
  }

  return chain;
}

function renderChain(chain: ChainStep[]): string {
  if (!chain.length) return `<p class="status">No chain found. Try another start.</p>`;
  return `
    <div class="domino-chain">
      ${chain.map((step, index) => `
        <a class="domino-tile" href="${spotifySearchUrl(`${step.artist} ${step.title}`)}" target="_blank" rel="noopener noreferrer">
          <span class="domino-index mono">${String(index + 1).padStart(2, "0")}</span>
          <span class="domino-side artist">${escapeHtml(step.artist)}</span>
          <span class="domino-divider">/</span>
          <span class="domino-side title">${escapeHtml(step.title)}</span>
          <span class="domino-meta mono">${fmtNum(step.plays)} plays · ${fmtHours(step.ms)}</span>
        </a>
      `).join("")}
    </div>
  `;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]!));
}

function renderStats(data: DominoData): string {
  const s = data.stats;
  const rows = [
    ["Songs", s.uniqueArtistTitleSongs],
    ["Shared titles", s.sharedTitles],
    ["Playable tiles", s.connectableSongs],
    ["Artists in net", s.connectableArtists],
    ["Chain-capable", s.continuationSongs],
  ];
  return `<div class="stats domino-stats">${rows.map(([k, v]) => `<div class="stat"><div class="k">${k}</div><div class="v">${fmtNum(v as number)}</div></div>`).join("")}</div>`;
}

function renderApp(data: DominoData) {
  const { byArtist } = buildLookups(data);
  const artistOptions = data.artists
    .filter((artist) => (byArtist.get(artist.key)?.length ?? 0) >= 1)
    .map((artist) => `<option value="${escapeHtml(artist.key)}">${escapeHtml(artist.name)}</option>`)
    .join("");

  app.innerHTML = `
    <header class="domino-hero">
      <a class="back-link" href="${import.meta.env.BASE_URL}">← Spotify Viz</a>
      <div class="eyebrow">prototype</div>
      <h1>Song Domino <span class="user-tag">· julian</span></h1>
      <p class="lead">Build chains where an artist's song title becomes the next artist name or another artist's matching song title. Generated from Spotify Extended Streaming History.</p>
      ${renderStats(data)}
    </header>
    <section class="viz-card domino-card">
      <header>
        <h2>Random chain</h2>
        <p class="subtitle">artist / title → title / next artist → …</p>
      </header>
      <div class="domino-controls">
        <label>Length <input id="length" type="range" min="4" max="24" value="12" /></label>
        <span id="lengthLabel" class="mono">12</span>
        <label>Start artist <select id="artist"><option value="">Random</option>${artistOptions}</select></label>
        <button id="reroll" type="button">New chain</button>
      </div>
      <div id="chain"></div>
    </section>
    <section class="viz-card domino-card">
      <header><h2>How dense is it?</h2><p class="subtitle">Enough material for a real game, but not every title connects.</p></header>
      <div class="domino-note">
        <p><strong>${fmtNum(data.stats.connectableSongs)}</strong> artist/title tiles can be played because their title exists for at least one other artist.</p>
        <p><strong>${fmtNum(data.stats.continuationSongs)}</strong> of those are chain-friendly: after landing on that artist, there is another shared-title move available.</p>
      </div>
    </section>
  `;

  const length = app.querySelector<HTMLInputElement>("#length")!;
  const lengthLabel = app.querySelector<HTMLSpanElement>("#lengthLabel")!;
  const artist = app.querySelector<HTMLSelectElement>("#artist")!;
  const chainRoot = app.querySelector<HTMLDivElement>("#chain")!;
  function reroll() {
    lengthLabel.textContent = length.value;
    const chain = generateChain(data, Number(length.value), artist.value || undefined);
    chainRoot.innerHTML = renderChain(chain);
  }
  length.addEventListener("input", reroll);
  artist.addEventListener("change", reroll);
  app.querySelector<HTMLButtonElement>("#reroll")!.addEventListener("click", reroll);
  reroll();
}

loadDominoData().then(renderApp).catch((err) => {
  app.innerHTML = `<div class="status">⚠ ${(err as Error).message}</div>`;
});
