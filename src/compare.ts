import "./styles.css";
import { fmtHours, fmtNum, type DataBundle, type TopArtist, type TopTrack } from "./lib/data";
import { attachHover, C_ACCENT, C_GRID, C_INK, C_MUTED, C_RULE, mkSvg, rect, text } from "./lib/util";

interface UserMeta { id: UserId; display: string; }
type UserId = "logge" | "tojokn" | "jonas" | "noel" | "julian";

interface UserBundle {
  user: UserMeta;
  data: DataBundle;
}

interface OverlapRow {
  key: string;
  label: string;
  sub?: string;
  aRank: number;
  bRank: number;
  aMs: number;
  bMs: number;
}

type RankedArtist = TopArtist & { rank: number };

const USERS: UserMeta[] = [
  { id: "logge", display: "logge" },
  { id: "tojokn", display: "tojokn" },
  { id: "jonas", display: "jonas" },
  { id: "noel", display: "noel" },
  { id: "julian", display: "julian" },
];

const USER_IDS = new Set(USERS.map((u) => u.id));
const TOP_N = 100;

function userMeta(id: string | null): UserMeta {
  return USERS.find((u) => u.id === id) ?? USERS[0];
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function hours(ms: number): number {
  return ms / 3_600_000;
}

function spanDays(data: DataBundle): number {
  return Math.max(1, (new Date(data.totals.lastPlay).getTime() - new Date(data.totals.firstPlay).getTime()) / 86_400_000);
}

function getUsersFromUrl(): [UserMeta, UserMeta] {
  const url = new URL(window.location.href);
  const pathParts = url.pathname.split("/").filter(Boolean);
  const compareAt = pathParts.indexOf("compare");
  const pathA = compareAt >= 0 ? pathParts[compareAt + 1] : null;
  const pathB = compareAt >= 0 ? pathParts[compareAt + 2] : null;
  const a = url.searchParams.get("a") ?? pathA;
  const b = url.searchParams.get("b") ?? pathB;
  const first = USER_IDS.has(a as UserId) ? userMeta(a) : USERS[0];
  const fallbackB = first.id === "tojokn" ? "logge" : "tojokn";
  const second = USER_IDS.has(b as UserId) && b !== first.id ? userMeta(b) : userMeta(fallbackB);
  return [first, second];
}

function compareUrl(a: UserId, b: UserId): string {
  const base = import.meta.env.BASE_URL;
  return `${base}compare/?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`;
}

async function loadUser(user: UserMeta): Promise<UserBundle> {
  const base = import.meta.env.BASE_URL;
  const res = await fetch(`${base}${user.id}/data.json`);
  if (!res.ok) throw new Error(`${user.id}/data.json fetch failed: ${res.status}`);
  return { user, data: (await res.json()) as DataBundle };
}

function rankedArtistMap(rows: TopArtist[]): Map<string, TopArtist & { rank: number }> {
  return new Map(rows.slice(0, TOP_N).map((row, i) => [row.a.toLowerCase(), { ...row, rank: i + 1 }]));
}

function rankedTrackMap(rows: TopTrack[]): Map<string, TopTrack & { rank: number; key: string }> {
  return new Map(rows.slice(0, TOP_N).map((row, i) => {
    const key = `${row.a.toLowerCase()}|${row.t.toLowerCase()}`;
    return [key, { ...row, key, rank: i + 1 }];
  }));
}

function overlapArtists(a: DataBundle, b: DataBundle): OverlapRow[] {
  const bm = rankedArtistMap(b.topArtists);
  return a.topArtists.slice(0, TOP_N).flatMap((ar, i) => {
    const br = bm.get(ar.a.toLowerCase());
    return br ? [{ key: ar.a.toLowerCase(), label: ar.a, aRank: i + 1, bRank: br.rank, aMs: ar.ms, bMs: br.ms }] : [];
  }).sort((x, y) => (x.aRank + x.bRank) - (y.aRank + y.bRank));
}

function overlapTracks(a: DataBundle, b: DataBundle): OverlapRow[] {
  const bm = rankedTrackMap(b.topTracks);
  return a.topTracks.slice(0, TOP_N).flatMap((ar, i) => {
    const key = `${ar.a.toLowerCase()}|${ar.t.toLowerCase()}`;
    const br = bm.get(key);
    return br ? [{ key, label: ar.t, sub: ar.a, aRank: i + 1, bRank: br.rank, aMs: ar.ms, bMs: br.ms }] : [];
  }).sort((x, y) => (x.aRank + x.bRank) - (y.aRank + y.bRank));
}

function onlyArtists(a: DataBundle, b: DataBundle): RankedArtist[] {
  const bm = rankedArtistMap(b.topArtists);
  return a.topArtists
    .slice(0, 25)
    .map((row, i) => ({ ...row, rank: i + 1 }))
    .filter((row) => !bm.has(row.a.toLowerCase()))
    .slice(0, 10);
}

function genreRows(a: DataBundle, b: DataBundle): OverlapRow[] {
  const ag = a.genres?.top.slice(0, TOP_N) ?? [];
  const bg = b.genres?.top.slice(0, TOP_N) ?? [];
  const bm = new Map(bg.map((row, i) => [row.g.toLowerCase(), { ...row, rank: i + 1 }]));
  return ag.flatMap((ar, i) => {
    const br = bm.get(ar.g.toLowerCase());
    return br ? [{ key: ar.g.toLowerCase(), label: ar.g, aRank: i + 1, bRank: br.rank, aMs: ar.ms, bMs: br.ms }] : [];
  }).sort((x, y) => (x.aRank + x.bRank) - (y.aRank + y.bRank));
}

function jaccard(overlap: number, sizeA: number, sizeB: number): number {
  const union = sizeA + sizeB - overlap;
  return union > 0 ? overlap / union : 0;
}

function compatibility(a: DataBundle, b: DataBundle): { score: number; artist: number; track: number; genre: number; clock: number } {
  const artists = overlapArtists(a, b).length;
  const tracks = overlapTracks(a, b).length;
  const genres = genreRows(a, b).length;
  const artist = jaccard(artists, Math.min(TOP_N, a.topArtists.length), Math.min(TOP_N, b.topArtists.length));
  const track = jaccard(tracks, Math.min(TOP_N, a.topTracks.length), Math.min(TOP_N, b.topTracks.length));
  const genre = jaccard(genres, Math.min(TOP_N, a.genres?.top.length ?? 0), Math.min(TOP_N, b.genres?.top.length ?? 0));
  const clock = 1 - normalizedClockDistance(a, b);
  const score = Math.round((artist * 0.34 + track * 0.26 + genre * 0.25 + clock * 0.15) * 100);
  return { score, artist, track, genre, clock };
}

function normalizedClock(data: DataBundle): number[] {
  const vals = data.clock.flat();
  const total = vals.reduce((s, v) => s + v, 0) || 1;
  return vals.map((v) => v / total);
}

function normalizedClockDistance(a: DataBundle, b: DataBundle): number {
  const av = normalizedClock(a);
  const bv = normalizedClock(b);
  let diff = 0;
  for (let i = 0; i < av.length; i++) diff += Math.abs(av[i] - bv[i]);
  return Math.min(1, diff / 2);
}

function renderKpis(a: UserBundle, b: UserBundle): string {
  const rows = [
    ["Plays", fmtNum(a.data.totals.totalPlays), fmtNum(b.data.totals.totalPlays)],
    ["Hours", fmtHours(a.data.totals.totalMs), fmtHours(b.data.totals.totalMs)],
    ["Avg h/day", `${(hours(a.data.totals.totalMs) / spanDays(a.data)).toFixed(2)} h`, `${(hours(b.data.totals.totalMs) / spanDays(b.data)).toFixed(2)} h`],
    ["Plays/day", `${(a.data.totals.totalPlays / spanDays(a.data)).toFixed(1)}`, `${(b.data.totals.totalPlays / spanDays(b.data)).toFixed(1)}`],
    ["Artists", fmtNum(a.data.totals.uniqueArtists), fmtNum(b.data.totals.uniqueArtists)],
    ["Tracks", fmtNum(a.data.totals.uniqueTracks), fmtNum(b.data.totals.uniqueTracks)],
    ["Top concentration", pct((a.data.topArtists[0]?.ms ?? 0) / a.data.totals.totalMs), pct((b.data.topArtists[0]?.ms ?? 0) / b.data.totals.totalMs)],
  ];
  return rows.map(([label, av, bv]) => `
    <div class="compare-kpi-row">
      <div class="compare-kpi-label">${label}</div>
      <div class="compare-kpi-value">${av}</div>
      <div class="compare-kpi-value">${bv}</div>
    </div>
  `).join("");
}

function normalizedMetrics(a: UserBundle, b: UserBundle): string {
  const metrics = [
    { label: "hours / active day", a: hours(a.data.totals.totalMs) / spanDays(a.data), b: hours(b.data.totals.totalMs) / spanDays(b.data), suffix: " h" },
    { label: "plays / active day", a: a.data.totals.totalPlays / spanDays(a.data), b: b.data.totals.totalPlays / spanDays(b.data), suffix: "" },
    { label: "minutes / play", a: a.data.totals.totalMs / a.data.totals.totalPlays / 60_000, b: b.data.totals.totalMs / b.data.totals.totalPlays / 60_000, suffix: " min" },
    { label: "artists / 1k plays", a: a.data.totals.uniqueArtists / a.data.totals.totalPlays * 1000, b: b.data.totals.uniqueArtists / b.data.totals.totalPlays * 1000, suffix: "" },
    { label: "tracks / 1k plays", a: a.data.totals.uniqueTracks / a.data.totals.totalPlays * 1000, b: b.data.totals.uniqueTracks / b.data.totals.totalPlays * 1000, suffix: "" },
  ];
  return metrics.map((m) => {
    const max = Math.max(m.a, m.b, 0.001);
    return `
      <div class="norm-row">
        <div class="norm-label">${m.label}</div>
        <div class="norm-bar"><span style="width:${(m.a / max) * 100}%"></span><b>${m.a.toFixed(2)}${m.suffix}</b></div>
        <div class="norm-bar b"><span style="width:${(m.b / max) * 100}%"></span><b>${m.b.toFixed(2)}${m.suffix}</b></div>
      </div>
    `;
  }).join("");
}

function overlapList(rows: OverlapRow[], aName: string, bName: string, empty: string): string {
  if (!rows.length) return `<p class="compare-empty">${empty}</p>`;
  return `<ol class="overlap-list">${rows.slice(0, 14).map((row) => `
    <li>
      <div class="overlap-main">
        <strong>${escapeHtml(row.label)}</strong>
        ${row.sub ? `<span>${escapeHtml(row.sub)}</span>` : ""}
      </div>
      <div class="overlap-ranks"><span>${aName} #${row.aRank}</span><span>${bName} #${row.bRank}</span></div>
      <div class="overlap-hours"><span>${fmtHours(row.aMs)}</span><span>${fmtHours(row.bMs)}</span></div>
    </li>
  `).join("")}</ol>`;
}

function onlyList(rows: RankedArtist[], owner: string): string {
  return `<ol class="only-list">${rows.map((row) => `
    <li><strong>${escapeHtml(row.a)}</strong><span>${owner} #${row.rank} · ${fmtHours(row.ms)} · ${fmtNum(row.plays)} plays</span></li>
  `).join("")}</ol>`;
}

function renderYearSvg(a: UserBundle, b: UserBundle): SVGSVGElement {
  const years = Array.from(new Set([...a.data.hoursPerYear.map((r) => r.y), ...b.data.hoursPerYear.map((r) => r.y)])).sort();
  const am = new Map(a.data.hoursPerYear.map((r) => [r.y, r.ms]));
  const bm = new Map(b.data.hoursPerYear.map((r) => [r.y, r.ms]));
  const W = 900, H = 340, ml = 56, mr = 24, mt = 26, mb = 46;
  const pw = W - ml - mr, ph = H - mt - mb;
  const svg = mkSvg(W, H);
  const max = Math.max(...years.flatMap((y) => [hours(am.get(y) ?? 0), hours(bm.get(y) ?? 0)]), 1);
  const niceMax = Math.ceil(max / 100) * 100 || 100;
  for (let i = 0; i <= 5; i++) {
    const v = niceMax * i / 5;
    const y = mt + ph - (v / niceMax) * ph;
    svg.appendChild(rect(ml, y, pw, 1, { fill: i === 0 ? C_RULE : C_GRID }));
    svg.appendChild(text(ml - 8, y + 4, String(v), { "text-anchor": "end", class: "axis num" }));
  }
  const slot = pw / years.length;
  const barW = Math.min(26, slot * 0.32);
  years.forEach((year, i) => {
    const av = am.get(year) ?? 0;
    const bv = bm.get(year) ?? 0;
    const x = ml + i * slot + slot / 2;
    const ah = hours(av) / niceMax * ph;
    const bh = hours(bv) / niceMax * ph;
    const ar = rect(x - barW - 2, mt + ph - ah, barW, ah, { fill: C_ACCENT });
    const br = rect(x + 2, mt + ph - bh, barW, bh, { fill: C_INK });
    attachHover(ar, `${a.user.display} ${year}: ${fmtHours(av)}`);
    attachHover(br, `${b.user.display} ${year}: ${fmtHours(bv)}`);
    svg.appendChild(ar);
    svg.appendChild(br);
    svg.appendChild(text(x, H - mb + 18, year, { "text-anchor": "middle", class: "axis num" }));
  });
  svg.appendChild(text(ml, 14, "HOURS PER YEAR", { class: "axis-label" }));
  svg.appendChild(text(W - mr - 150, 14, a.user.display, { fill: C_ACCENT, "font-weight": 700 }));
  svg.appendChild(text(W - mr - 78, 14, b.user.display, { fill: C_INK, "font-weight": 700 }));
  return svg;
}

function renderClockDiffSvg(a: UserBundle, b: UserBundle): SVGSVGElement {
  const days = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  const W = 900, H = 310, ml = 38, mr = 118, mt = 28, mb = 42;
  const pw = W - ml - mr, ph = H - mt - mb;
  const cw = pw / 24, ch = ph / 7;
  const svg = mkSvg(W, H);
  const at = a.data.clock.flat().reduce((s, v) => s + v, 0) || 1;
  const bt = b.data.clock.flat().reduce((s, v) => s + v, 0) || 1;
  const diffs: number[][] = [];
  let max = 0;
  for (let d = 0; d < 7; d++) {
    diffs[d] = [];
    for (let h = 0; h < 24; h++) {
      const diff = (a.data.clock[d][h] / at) - (b.data.clock[d][h] / bt);
      diffs[d][h] = diff;
      max = Math.max(max, Math.abs(diff));
    }
  }
  const color = (v: number) => {
    const t = Math.abs(v) / (max || 1);
    return v >= 0 ? `rgba(29, 185, 84, ${0.08 + t * 0.82})` : `rgba(17, 20, 24, ${0.07 + t * 0.76})`;
  };
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      const r = rect(ml + h * cw, mt + d * ch, cw - 1, ch - 1, { fill: color(diffs[d][h]) });
      attachHover(r, `${days[d]} ${String(h).padStart(2, "0")}:00  ${diffs[d][h] >= 0 ? a.user.display : b.user.display} +${pct(Math.abs(diffs[d][h]))}`);
      svg.appendChild(r);
    }
  }
  days.forEach((day, d) => svg.appendChild(text(ml - 8, mt + d * ch + ch / 2 + 4, day, { "text-anchor": "end", class: "axis" })));
  for (let h = 0; h < 24; h += 3) svg.appendChild(text(ml + h * cw + cw / 2, H - mb + 16, String(h).padStart(2, "0"), { "text-anchor": "middle", class: "axis num" }));
  svg.appendChild(text(ml + pw / 2, H - 8, "HOUR OF DAY (UTC)", { "text-anchor": "middle", class: "axis-label" }));
  svg.appendChild(text(W - mr + 14, mt + 18, a.user.display, { fill: C_ACCENT, "font-weight": 700 }));
  svg.appendChild(text(W - mr + 14, mt + 44, b.user.display, { fill: C_INK, "font-weight": 700 }));
  svg.appendChild(text(W - mr + 14, mt + 70, "darker = larger normalized difference", { fill: C_MUTED, "font-size": 10 }));
  return svg;
}

async function main() {
  const app = document.querySelector<HTMLDivElement>("#app")!;
  const [aMeta, bMeta] = getUsersFromUrl();
  app.innerHTML = `<div class="status">loading comparison…</div>`;

  let a: UserBundle;
  let b: UserBundle;
  try {
    [a, b] = await Promise.all([loadUser(aMeta), loadUser(bMeta)]);
  } catch (err) {
    app.innerHTML = `<div class="status">⚠ ${(err as Error).message}</div>`;
    return;
  }

  const score = compatibility(a.data, b.data);
  const artistOverlap = overlapArtists(a.data, b.data);
  const trackOverlap = overlapTracks(a.data, b.data);
  const genres = genreRows(a.data, b.data);

  app.innerHTML = `
    <header class="compare-head">
      <div>
        <a class="back-link" href="${import.meta.env.BASE_URL}">← reports</a>
        <h1>Spotify Compare <span class="user-tag">· ${a.user.display} vs ${b.user.display}</span></h1>
        <p class="lead">${a.data.totals.firstPlay.slice(0, 10)} → ${a.data.totals.lastPlay.slice(0, 10)} · ${b.data.totals.firstPlay.slice(0, 10)} → ${b.data.totals.lastPlay.slice(0, 10)}</p>
      </div>
      <form class="compare-picker" id="picker">
        <label><span>A</span><select name="a">${USERS.map((u) => `<option value="${u.id}" ${u.id === a.user.id ? "selected" : ""}>${u.display}</option>`).join("")}</select></label>
        <label><span>B</span><select name="b">${USERS.map((u) => `<option value="${u.id}" ${u.id === b.user.id ? "selected" : ""}>${u.display}</option>`).join("")}</select></label>
      </form>
    </header>

    <section class="compare-score">
      <div class="score-ring" style="--score:${score.score}"><strong>${score.score}</strong><span>compatibility</span></div>
      <div class="score-parts">
        <div><b>${pct(score.artist)}</b><span>top artist overlap</span></div>
        <div><b>${pct(score.track)}</b><span>top track overlap</span></div>
        <div><b>${pct(score.genre)}</b><span>genre overlap</span></div>
        <div><b>${pct(score.clock)}</b><span>clock similarity</span></div>
      </div>
    </section>

    <section class="compare-grid">
      <div class="viz-card compare-panel">
        <header><h2>Side-by-side KPIs</h2><p class="subtitle">${a.user.display} · ${b.user.display}</p></header>
        <div class="compare-kpis">
          <div class="compare-kpi-row head"><div></div><div>${a.user.display}</div><div>${b.user.display}</div></div>
          ${renderKpis(a, b)}
        </div>
      </div>
      <div class="viz-card compare-panel">
        <header><h2>Normalized Metrics</h2><p class="subtitle">scale-adjusted comparison</p></header>
        <div class="norm-list">${normalizedMetrics(a, b)}</div>
      </div>
    </section>

    <section class="compare-grid">
      <div class="viz-card compare-panel">
        <header><h2>Top Artist Overlap</h2><p class="subtitle">shared top-${TOP_N} artists</p></header>
        ${overlapList(artistOverlap, a.user.display, b.user.display, "No shared top artists in the compared range.")}
      </div>
      <div class="viz-card compare-panel">
        <header><h2>Top Track Overlap</h2><p class="subtitle">shared top-${TOP_N} tracks</p></header>
        ${overlapList(trackOverlap, a.user.display, b.user.display, "No shared top tracks in the compared range.")}
      </div>
    </section>

    <section class="compare-grid">
      <div class="viz-card compare-panel">
        <header><h2>Only ${a.user.display}</h2><p class="subtitle">top artists absent from ${b.user.display}'s top-${TOP_N}</p></header>
        ${onlyList(onlyArtists(a.data, b.data), a.user.display)}
      </div>
      <div class="viz-card compare-panel">
        <header><h2>Only ${b.user.display}</h2><p class="subtitle">top artists absent from ${a.user.display}'s top-${TOP_N}</p></header>
        ${onlyList(onlyArtists(b.data, a.data), b.user.display)}
      </div>
    </section>

    <section class="viz-card">
      <header><h2>Genre Overlap</h2><p class="subtitle">shared Spotify-API genres in each top-${TOP_N}</p></header>
      ${overlapList(genres, a.user.display, b.user.display, "No shared genres in the compared range.")}
    </section>

    <section class="viz-card" id="year-chart">
      <header><h2>Yearly Hours Comparison</h2><p class="subtitle">absolute yearly listening hours</p></header>
    </section>

    <section class="viz-card" id="clock-diff">
      <header><h2>Listening Clock Difference</h2><p class="subtitle">normalized weekday × hour share difference</p></header>
    </section>

    <footer>local-only · processed from Spotify Extended Streaming History</footer>
  `;

  app.querySelector<HTMLFormElement>("#picker")!.addEventListener("change", (event) => {
    const form = event.currentTarget as HTMLFormElement;
    let nextA = (form.elements.namedItem("a") as HTMLSelectElement).value as UserId;
    let nextB = (form.elements.namedItem("b") as HTMLSelectElement).value as UserId;
    if (nextA === nextB) nextB = USERS.find((u) => u.id !== nextA)!.id;
    window.location.href = compareUrl(nextA, nextB);
  });

  app.querySelector("#year-chart")!.appendChild(renderYearSvg(a, b));
  app.querySelector("#clock-diff")!.appendChild(renderClockDiffSvg(a, b));
}

main();
