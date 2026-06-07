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

type Tile = DominoEdge & {
  id: string;
  artist: string;
  title: string;
};

type PlacedTile = Tile & {
  left: string;
  right: string;
  leftKind: "artist" | "title";
  rightKind: "artist" | "title";
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

function buildTiles(data: DominoData): Tile[] {
  const artistName = new Map(data.artists.map((artist) => [artist.key, artist.name]));
  const titleName = new Map(data.titles.map((title) => [title.key, title.title]));
  return data.edges.map((edge) => ({
    ...edge,
    id: `${edge.a}\u0000${edge.t}`,
    artist: artistName.get(edge.a) ?? edge.a,
    title: titleName.get(edge.t) ?? edge.t,
  }));
}

function weightedPick(tiles: Tile[]): Tile {
  const total = tiles.reduce((sum, tile) => sum + Math.sqrt(tile.plays), 0);
  let r = Math.random() * total;
  for (const tile of tiles) {
    r -= Math.sqrt(tile.plays);
    if (r <= 0) return tile;
  }
  return tiles[tiles.length - 1];
}

function tileLeftRight(tile: Tile, openKey: string): PlacedTile | null {
  if (tile.a === openKey) {
    return { ...tile, left: tile.artist, right: tile.title, leftKind: "artist", rightKind: "title" };
  }
  if (tile.t === openKey) {
    return { ...tile, left: tile.title, right: tile.artist, leftKind: "title", rightKind: "artist" };
  }
  return null;
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

function renderPlacedTile(tile: PlacedTile, index: number): string {
  return `
    <div class="domino-tile placed">
      <span class="domino-index mono">${String(index + 1).padStart(2, "0")}</span>
      <span class="domino-side ${tile.leftKind}">${escapeHtml(tile.left)}</span>
      <span class="domino-divider">/</span>
      <span class="domino-side ${tile.rightKind}">${escapeHtml(tile.right)}</span>
      <a class="domino-meta mono" href="${spotifySearchUrl(`${tile.artist} ${tile.title}`)}" target="_blank" rel="noopener noreferrer">${fmtNum(tile.plays)} plays · ${fmtHours(tile.ms)}</a>
    </div>
  `;
}

function renderCandidate(tile: PlacedTile, remainingCount: number): string {
  return `
    <button class="domino-tile candidate" data-id="${escapeHtml(tile.id)}" type="button">
      <span class="domino-index mono">+${remainingCount}</span>
      <span class="domino-side ${tile.leftKind}">${escapeHtml(tile.left)}</span>
      <span class="domino-divider">/</span>
      <span class="domino-side ${tile.rightKind}">${escapeHtml(tile.right)}</span>
      <span class="domino-meta mono">${fmtNum(tile.plays)} plays · ${fmtHours(tile.ms)}</span>
    </button>
  `;
}

function renderApp(data: DominoData) {
  const tiles = buildTiles(data);
  const byId = new Map(tiles.map((tile) => [tile.id, tile]));
  let placed: PlacedTile[] = [];
  let openKey = "";
  let openLabel = "";
  let used = new Set<string>();
  let candidateLimit = 36;
  let score = 0;

  app.innerHTML = `
    <header class="domino-hero">
      <a class="back-link" href="${import.meta.env.BASE_URL}">← Spotify Viz</a>
      <div class="eyebrow">game prototype</div>
      <h1>Song Domino <span class="user-tag">· julian</span></h1>
      <p class="lead">Lege echte Artist/Song-Steine. Ein Stein darf gedreht werden; spielbar ist nur, wenn eine Seite exakt ans offene Ende passt.</p>
      ${renderStats(data)}
    </header>
    <section class="viz-card domino-card">
      <header>
        <h2>Board</h2>
        <p class="subtitle">Open end: <strong id="openEnd">—</strong> · Score: <strong id="score">0</strong></p>
      </header>
      <div class="domino-controls game-controls">
        <button id="newGame" type="button">New game</button>
        <button id="hint" type="button">Hint / random legal tile</button>
        <label>Shown legal tiles <input id="limit" type="range" min="12" max="96" value="36" step="12" /></label>
        <span id="limitLabel" class="mono">36</span>
      </div>
      <div id="board" class="domino-chain"></div>
    </section>
    <section class="viz-card domino-card">
      <header>
        <h2>Legal stones</h2>
        <p class="subtitle" id="legalSubtitle">Only stones that fit the open end appear here.</p>
      </header>
      <div id="candidates" class="domino-chain"></div>
    </section>
  `;

  const board = app.querySelector<HTMLDivElement>("#board")!;
  const candidates = app.querySelector<HTMLDivElement>("#candidates")!;
  const openEnd = app.querySelector<HTMLElement>("#openEnd")!;
  const scoreEl = app.querySelector<HTMLElement>("#score")!;
  const legalSubtitle = app.querySelector<HTMLElement>("#legalSubtitle")!;
  const limit = app.querySelector<HTMLInputElement>("#limit")!;
  const limitLabel = app.querySelector<HTMLSpanElement>("#limitLabel")!;

  function legalTiles(): PlacedTile[] {
    return tiles
      .filter((tile) => !used.has(tile.id))
      .map((tile) => tileLeftRight(tile, openKey))
      .filter((tile): tile is PlacedTile => Boolean(tile))
      .sort((a, b) => b.plays - a.plays || a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title));
  }

  function render() {
    board.innerHTML = placed.map(renderPlacedTile).join("");
    openEnd.textContent = openLabel || "—";
    scoreEl.textContent = String(score);

    const legal = legalTiles();
    legalSubtitle.textContent = legal.length
      ? `${fmtNum(legal.length)} legal stones fit “${openLabel}”. Pick one.`
      : `No legal stones left for “${openLabel}”. Game over.`;
    candidates.innerHTML = legal.length
      ? legal.slice(0, candidateLimit).map((tile) => renderCandidate(tile, legal.length)).join("")
      : `<p class="status">Game over — chain length ${placed.length}. Start a new game.</p>`;

    candidates.querySelectorAll<HTMLButtonElement>(".candidate").forEach((button) => {
      button.addEventListener("click", () => {
        const tile = byId.get(button.dataset.id ?? "");
        if (tile) placeTile(tile);
      });
    });
  }

  function placeTile(tile: Tile) {
    const oriented = tileLeftRight(tile, openKey);
    if (!oriented) return;
    used.add(tile.id);
    placed.push(oriented);
    openKey = oriented.rightKind === "artist" ? oriented.a : oriented.t;
    openLabel = oriented.right;
    score = placed.length;
    render();
  }

  function startGame(start?: Tile) {
    used = new Set<string>();
    placed = [];
    const first = start ?? weightedPick(tiles.filter((tile) => tile.plays >= 2));
    used.add(first.id);
    const oriented: PlacedTile = { ...first, left: first.artist, right: first.title, leftKind: "artist", rightKind: "title" };
    placed.push(oriented);
    openKey = first.t;
    openLabel = first.title;
    score = 1;
    render();
  }

  app.querySelector<HTMLButtonElement>("#newGame")!.addEventListener("click", () => startGame());
  app.querySelector<HTMLButtonElement>("#hint")!.addEventListener("click", () => {
    const legal = legalTiles();
    if (legal.length) placeTile(pick(legal));
  });
  limit.addEventListener("input", () => {
    candidateLimit = Number(limit.value);
    limitLabel.textContent = limit.value;
    render();
  });

  startGame();
}

loadDominoData().then(renderApp).catch((err) => {
  app.innerHTML = `<div class="status">⚠ ${(err as Error).message}</div>`;
});
