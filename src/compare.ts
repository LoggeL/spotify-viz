import "./styles.css";
import { fmtHours, fmtNum, type DataBundle, type TopArtist, type TopTrack } from "./lib/data";
import { attachHover, C_ACCENT, C_GRID, C_INK, C_MUTED, C_RULE, line, mkSvg, path, rect, text } from "./lib/util";

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
  aPlays?: number;
  bPlays?: number;
}

type RankedArtist = TopArtist & { rank: number };
type SeriesRow = { key: string; a: number; b: number; label?: string };
type BarRow = { label: string; a: number; b: number; fmt?: (n: number) => string };
type NamedMetric = { label: string; a: string; b: string; detail?: string };

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

function pct1(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function hours(ms: number): number {
  return ms / 3_600_000;
}

function plays(n: number): string {
  return fmtNum(Math.round(n));
}

function monthLabel(ym: string): string {
  return ym.slice(2).replace("-", "/");
}

function safeDiv(a: number, b: number): number {
  return b ? a / b : 0;
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
    return br ? [{ key, label: ar.t, sub: ar.a, aRank: i + 1, bRank: br.rank, aMs: ar.ms, bMs: br.ms, aPlays: ar.plays, bPlays: br.plays }] : [];
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

function advancedCompatibility(a: DataBundle, b: DataBundle) {
  const base = compatibility(a, b);
  const weekday = 1 - distributionDistance(
    a.weekday.map((r) => r.ms),
    b.weekday.map((r) => r.ms),
  );
  const platform = 1 - mapDistributionDistance(platformTotals(a), platformTotals(b));
  const shuffle = 1 - Math.abs(safeDiv(a.shuffle.shuffleMs, a.shuffle.shuffleMs + a.shuffle.intentionalMs) - safeDiv(b.shuffle.shuffleMs, b.shuffle.shuffleMs + b.shuffle.intentionalMs));
  const skip = 1 - Math.min(1, Math.abs((a.skipStats?.globalRate ?? 0) - (b.skipStats?.globalRate ?? 0)) / 0.6);
  const discovery = 1 - Math.min(1, Math.abs(discoveryRate(a) - discoveryRate(b)) / Math.max(discoveryRate(a), discoveryRate(b), 0.01));
  const concentration = 1 - Math.min(1, Math.abs(topShare(a, 10) - topShare(b, 10)) / Math.max(topShare(a, 10), topShare(b, 10), 0.01));
  const score = Math.round((
    base.artist * 0.22 +
    base.track * 0.16 +
    base.genre * 0.16 +
    base.clock * 0.12 +
    weekday * 0.08 +
    platform * 0.07 +
    shuffle * 0.06 +
    skip * 0.05 +
    discovery * 0.04 +
    concentration * 0.04
  ) * 100);
  return { ...base, score, weekday, platform, shuffle, skip, discovery, concentration };
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

function distributionDistance(aVals: number[], bVals: number[]): number {
  const at = aVals.reduce((s, v) => s + v, 0) || 1;
  const bt = bVals.reduce((s, v) => s + v, 0) || 1;
  const n = Math.max(aVals.length, bVals.length);
  let diff = 0;
  for (let i = 0; i < n; i++) diff += Math.abs((aVals[i] ?? 0) / at - (bVals[i] ?? 0) / bt);
  return Math.min(1, diff / 2);
}

function mapDistributionDistance(a: Map<string, number>, b: Map<string, number>): number {
  const keys = Array.from(new Set([...a.keys(), ...b.keys()]));
  return distributionDistance(keys.map((k) => a.get(k) ?? 0), keys.map((k) => b.get(k) ?? 0));
}

function platformTotals(data: DataBundle): Map<string, number> {
  const m = new Map<string, number>();
  for (const row of data.platformStack) {
    const ms = row._ms ?? {};
    for (const [k, v] of Object.entries(ms)) {
      if (k !== "year" && typeof v === "number") m.set(k, (m.get(k) ?? 0) + v);
    }
  }
  return m;
}

function discoveryRate(data: DataBundle): number {
  return safeDiv(data.discovery.reduce((s, r) => s + r.n, 0), data.totals.totalPlays);
}

function topShare(data: DataBundle, n: number): number {
  return safeDiv(data.topArtists.slice(0, n).reduce((s, r) => s + r.ms, 0), data.totals.totalMs);
}

function rowsFromUnion(aRows: { ym: string; ms: number }[], bRows: { ym: string; ms: number }[]): SeriesRow[] {
  const keys = Array.from(new Set([...aRows.map((r) => r.ym), ...bRows.map((r) => r.ym)])).sort();
  const am = new Map(aRows.map((r) => [r.ym, r.ms]));
  const bm = new Map(bRows.map((r) => [r.ym, r.ms]));
  return keys.map((key) => ({ key, a: hours(am.get(key) ?? 0), b: hours(bm.get(key) ?? 0), label: monthLabel(key) }));
}

function cumulativeRows(a: DataBundle, b: DataBundle): SeriesRow[] {
  return rowsFromUnion(a.cumulative, b.cumulative);
}

function weekdayRows(a: DataBundle, b: DataBundle): BarRow[] {
  const names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const at = a.weekday.reduce((s, r) => s + r.ms, 0) || 1;
  const bt = b.weekday.reduce((s, r) => s + r.ms, 0) || 1;
  return names.map((label, i) => ({ label, a: safeDiv(a.weekday[i]?.ms ?? 0, at), b: safeDiv(b.weekday[i]?.ms ?? 0, bt), fmt: pct1 }));
}

function platformRows(a: DataBundle, b: DataBundle): BarRow[] {
  const am = platformTotals(a);
  const bm = platformTotals(b);
  const keys = Array.from(new Set([...am.keys(), ...bm.keys()]));
  const at = Array.from(am.values()).reduce((s, v) => s + v, 0) || 1;
  const bt = Array.from(bm.values()).reduce((s, v) => s + v, 0) || 1;
  return keys
    .map((label) => ({ label, a: safeDiv(am.get(label) ?? 0, at), b: safeDiv(bm.get(label) ?? 0, bt), fmt: pct1 }))
    .sort((x, y) => (y.a + y.b) - (x.a + x.b));
}

function shuffleRows(a: DataBundle, b: DataBundle): BarRow[] {
  const at = a.shuffle.shuffleMs + a.shuffle.intentionalMs || 1;
  const bt = b.shuffle.shuffleMs + b.shuffle.intentionalMs || 1;
  return [
    { label: "shuffle", a: safeDiv(a.shuffle.shuffleMs, at), b: safeDiv(b.shuffle.shuffleMs, bt), fmt: pct1 },
    { label: "intentional", a: safeDiv(a.shuffle.intentionalMs, at), b: safeDiv(b.shuffle.intentionalMs, bt), fmt: pct1 },
  ];
}

function skipRows(a: DataBundle, b: DataBundle): BarRow[] {
  return [
    { label: "global skip rate", a: a.skipStats?.globalRate ?? 0, b: b.skipStats?.globalRate ?? 0, fmt: pct1 },
    { label: "skips / 1k plays", a: safeDiv(a.skipStats?.globalSkips ?? 0, a.totals.totalPlays) * 1000, b: safeDiv(b.skipStats?.globalSkips ?? 0, b.totals.totalPlays) * 1000, fmt: (n) => n.toFixed(1) },
    { label: "avg skip seconds", a: (a.skipStats?.avgSkipMs ?? 0) / 1000, b: (b.skipStats?.avgSkipMs ?? 0) / 1000, fmt: (n) => `${n.toFixed(1)}s` },
  ];
}

function discoveryRows(a: DataBundle, b: DataBundle): BarRow[] {
  const aRecent = a.firstPlays.filter((r) => r.first.slice(0, 4) === a.totals.lastPlay.slice(0, 4)).length;
  const bRecent = b.firstPlays.filter((r) => r.first.slice(0, 4) === b.totals.lastPlay.slice(0, 4)).length;
  return [
    { label: "new artists / 1k plays", a: discoveryRate(a) * 1000, b: discoveryRate(b) * 1000, fmt: (n) => n.toFixed(2) },
    { label: "known artists", a: a.totals.uniqueArtists - a.firstPlays.length, b: b.totals.uniqueArtists - b.firstPlays.length, fmt: plays },
    { label: "new in latest year", a: aRecent, b: bRecent, fmt: plays },
  ];
}

function dayHistRows(a: DataBundle, b: DataBundle): BarRow[] {
  const at = a.dayHist.reduce((s, r) => s + r.n, 0) || 1;
  const bt = b.dayHist.reduce((s, r) => s + r.n, 0) || 1;
  const bm = new Map(b.dayHist.map((r) => [r.bucket, r.n]));
  return a.dayHist.map((row) => ({ label: row.bucket, a: row.n / at, b: (bm.get(row.bucket) ?? 0) / bt, fmt: pct1 }));
}

function genreDiversityRows(a: DataBundle, b: DataBundle): SeriesRow[] {
  const ar = a.genres?.diversity ?? [];
  const br = b.genres?.diversity ?? [];
  const years = Array.from(new Set([...ar.map((r) => r.year), ...br.map((r) => r.year)])).sort();
  const am = new Map(ar.map((r) => [r.year, r.n]));
  const bm = new Map(br.map((r) => [r.year, r.n]));
  return years.map((key) => ({ key, a: am.get(key) ?? 0, b: bm.get(key) ?? 0, label: key }));
}

function topGenreRows(a: DataBundle, b: DataBundle): BarRow[] {
  const ag = a.genres?.top.slice(0, 10) ?? [];
  const bg = b.genres?.top.slice(0, 10) ?? [];
  const keys = Array.from(new Set([...ag.map((r) => r.g), ...bg.map((r) => r.g)])).slice(0, 16);
  const am = new Map((a.genres?.top ?? []).map((r) => [r.g, safeDiv(r.ms, a.genres?.totalTopMs ?? a.totals.totalMs)]));
  const bm = new Map((b.genres?.top ?? []).map((r) => [r.g, safeDiv(r.ms, b.genres?.totalTopMs ?? b.totals.totalMs)]));
  return keys.map((label) => ({ label, a: am.get(label) ?? 0, b: bm.get(label) ?? 0, fmt: pct1 })).sort((x, y) => (y.a + y.b) - (x.a + x.b));
}

function topAlbumsOverlap(a: DataBundle, b: DataBundle): OverlapRow[] {
  const bm = new Map(b.topAlbums.slice(0, TOP_N).map((row, i) => [`${row.a.toLowerCase()}|${row.al.toLowerCase()}`, { ...row, rank: i + 1 }]));
  return a.topAlbums.slice(0, TOP_N).flatMap((ar, i) => {
    const key = `${ar.a.toLowerCase()}|${ar.al.toLowerCase()}`;
    const br = bm.get(key);
    return br ? [{ key, label: ar.al, sub: ar.a, aRank: i + 1, bRank: br.rank, aMs: ar.ms, bMs: br.ms }] : [];
  }).sort((x, y) => (x.aRank + x.bRank) - (y.aRank + y.bRank));
}

function commonWeighted(rows: OverlapRow[], by: "hours" | "plays" = "hours"): OverlapRow[] {
  return [...rows].sort((x, y) => {
    const xs = by === "hours" ? x.aMs + x.bMs : (x.aPlays ?? 0) + (x.bPlays ?? 0);
    const ys = by === "hours" ? y.aMs + y.bMs : (y.aPlays ?? 0) + (y.bPlays ?? 0);
    return ys - xs;
  });
}

function yearlyDeltaRows(a: DataBundle, b: DataBundle): NamedMetric[] {
  const years = Array.from(new Set([...a.hoursPerYear.map((r) => r.y), ...b.hoursPerYear.map((r) => r.y)])).sort();
  const am = new Map(a.hoursPerYear.map((r) => [r.y, r.ms]));
  const bm = new Map(b.hoursPerYear.map((r) => [r.y, r.ms]));
  return years.map((y) => ({ y, av: am.get(y) ?? 0, bv: bm.get(y) ?? 0 }))
    .sort((x, y) => Math.abs(y.av - y.bv) - Math.abs(x.av - x.bv))
    .slice(0, 8)
    .map((r) => ({ label: r.y, a: fmtHours(r.av), b: fmtHours(r.bv), detail: `${fmtHours(Math.abs(r.av - r.bv))} delta` }));
}

function monthlyDeltaRows(a: DataBundle, b: DataBundle): NamedMetric[] {
  const rows = rowsFromUnion(a.yearMonth, b.yearMonth);
  return rows
    .sort((x, y) => Math.abs(y.a - y.b) - Math.abs(x.a - x.b))
    .slice(0, 10)
    .map((r) => ({ label: r.key, a: `${r.a.toFixed(1)} h`, b: `${r.b.toFixed(1)} h`, detail: `${Math.abs(r.a - r.b).toFixed(1)} h delta` }));
}

function sessionRows(a: DataBundle, b: DataBundle): BarRow[] {
  const avgA = safeDiv(a.totals.totalMs, a.sessions.total);
  const avgB = safeDiv(b.totals.totalMs, b.sessions.total);
  const peakA = a.sessions.byHour.reduce((best, row) => row.count > best.count ? row : best, a.sessions.byHour[0] ?? { h: 0, count: 0, avgTracks: 0, avgMs: 0 });
  const peakB = b.sessions.byHour.reduce((best, row) => row.count > best.count ? row : best, b.sessions.byHour[0] ?? { h: 0, count: 0, avgTracks: 0, avgMs: 0 });
  return [
    { label: "sessions", a: a.sessions.total, b: b.sessions.total, fmt: plays },
    { label: "avg session min", a: avgA / 60_000, b: avgB / 60_000, fmt: (n) => n.toFixed(1) },
    { label: "longest session h", a: hours(a.records.longestSession.ms), b: hours(b.records.longestSession.ms), fmt: (n) => n.toFixed(1) },
    { label: "longest tracks", a: a.records.longestSessionByTracks.tracks, b: b.records.longestSessionByTracks.tracks, fmt: plays },
    { label: "peak session hour", a: peakA.h, b: peakB.h, fmt: (n) => String(Math.round(n)).padStart(2, "0") },
  ];
}

function recordRows(a: DataBundle, b: DataBundle): NamedMetric[] {
  return [
    { label: "longest day", a: `${fmtHours(a.records.longestDay.ms)} (${a.records.longestDay.d})`, b: `${fmtHours(b.records.longestDay.ms)} (${b.records.longestDay.d})` },
    { label: "most plays day", a: `${fmtNum(a.records.mostPlaysDay.plays)} (${a.records.mostPlaysDay.d})`, b: `${fmtNum(b.records.mostPlaysDay.plays)} (${b.records.mostPlaysDay.d})` },
    { label: "biggest month", a: `${fmtHours(a.records.biggestMonth.ms)} (${a.records.biggestMonth.ym})`, b: `${fmtHours(b.records.biggestMonth.ms)} (${b.records.biggestMonth.ym})` },
    { label: "biggest year", a: `${fmtHours(a.records.biggestYear.ms)} (${a.records.biggestYear.y})`, b: `${fmtHours(b.records.biggestYear.ms)} (${b.records.biggestYear.y})` },
    { label: "longest streak", a: `${a.records.longestStreak.days} days`, b: `${b.records.longestStreak.days} days` },
    { label: "longest gap", a: `${a.records.longestGap.days} days`, b: `${b.records.longestGap.days} days` },
    { label: "repeat champion", a: `${a.records.repeatChampion.n}x ${a.records.repeatChampion.track}`, b: `${b.records.repeatChampion.n}x ${b.records.repeatChampion.track}` },
  ];
}

function concentrationRows(a: DataBundle, b: DataBundle): BarRow[] {
  const shares = [1, 5, 10, 25, 50];
  return shares.map((n) => ({ label: `top ${n} artists`, a: topShare(a, n), b: topShare(b, n), fmt: pct1 }));
}

function renderComparisonBars(rows: BarRow[], aName: string, bName: string): string {
  return rows.map((row) => {
    const max = Math.max(row.a, row.b, 0.001);
    const fmt = row.fmt ?? ((n: number) => n.toFixed(1));
    return `
      <div class="compare-bar-row">
        <div class="compare-bar-label">${escapeHtml(row.label)}</div>
        <div class="compare-bar a"><span style="width:${(row.a / max) * 100}%"></span><b>${fmt(row.a)}</b></div>
        <div class="compare-bar b"><span style="width:${(row.b / max) * 100}%"></span><b>${fmt(row.b)}</b></div>
      </div>
    `;
  }).join("") + `<div class="compare-bar-legend"><span class="a">${escapeHtml(aName)}</span><span class="b">${escapeHtml(bName)}</span></div>`;
}

function renderMetricTable(rows: NamedMetric[], aName: string, bName: string): string {
  return `<div class="compare-table">
    <div class="compare-table-row head"><div>Metric</div><div>${escapeHtml(aName)}</div><div>${escapeHtml(bName)}</div><div></div></div>
    ${rows.map((r) => `
      <div class="compare-table-row">
        <div>${escapeHtml(r.label)}</div>
        <div>${escapeHtml(r.a)}</div>
        <div>${escapeHtml(r.b)}</div>
        <div>${escapeHtml(r.detail ?? "")}</div>
      </div>
    `).join("")}
  </div>`;
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

function renderPairedBarSvg(rows: SeriesRow[], aName: string, bName: string, title: string, fmt: (n: number) => string = (n) => n.toFixed(1)): SVGSVGElement {
  const W = 900, H = 320, ml = 52, mr = 24, mt = 28, mb = 52;
  const pw = W - ml - mr, ph = H - mt - mb;
  const svg = mkSvg(W, H);
  const max = Math.max(...rows.flatMap((r) => [r.a, r.b]), 1);
  const niceMax = Math.ceil(max / 25) * 25 || 25;
  for (let i = 0; i <= 5; i++) {
    const v = niceMax * i / 5;
    const y = mt + ph - (v / niceMax) * ph;
    svg.appendChild(rect(ml, y, pw, 1, { fill: i === 0 ? C_RULE : C_GRID }));
    svg.appendChild(text(ml - 8, y + 4, fmt(v), { "text-anchor": "end", class: "axis num" }));
  }
  const slot = pw / rows.length;
  const barW = Math.max(1.8, Math.min(10, slot * 0.34));
  const labelEvery = Math.max(1, Math.ceil(rows.length / 12));
  rows.forEach((row, i) => {
    const x = ml + i * slot + slot / 2;
    const ah = row.a / niceMax * ph;
    const bh = row.b / niceMax * ph;
    const ar = rect(x - barW - 1, mt + ph - ah, barW, ah, { fill: C_ACCENT });
    const br = rect(x + 1, mt + ph - bh, barW, bh, { fill: C_INK });
    attachHover(ar, `${aName} ${row.key}: ${fmt(row.a)}`);
    attachHover(br, `${bName} ${row.key}: ${fmt(row.b)}`);
    svg.appendChild(ar);
    svg.appendChild(br);
    if (i % labelEvery === 0) svg.appendChild(text(x, H - mb + 18, row.label ?? row.key, { "text-anchor": "middle", class: "axis num" }));
  });
  svg.appendChild(text(ml, 14, title, { class: "axis-label" }));
  svg.appendChild(text(W - mr - 152, 14, aName, { fill: C_ACCENT, "font-weight": 700 }));
  svg.appendChild(text(W - mr - 82, 14, bName, { fill: C_INK, "font-weight": 700 }));
  return svg;
}

function renderLineSvg(rows: SeriesRow[], aName: string, bName: string, title: string, fmt: (n: number) => string = (n) => n.toFixed(1)): SVGSVGElement {
  const W = 900, H = 320, ml = 58, mr = 24, mt = 28, mb = 48;
  const pw = W - ml - mr, ph = H - mt - mb;
  const svg = mkSvg(W, H);
  const max = Math.max(...rows.flatMap((r) => [r.a, r.b]), 1);
  const niceMax = Math.ceil(max / 100) * 100 || 100;
  for (let i = 0; i <= 5; i++) {
    const v = niceMax * i / 5;
    const y = mt + ph - (v / niceMax) * ph;
    svg.appendChild(line(ml, y, W - mr, y, { stroke: i === 0 ? C_RULE : C_GRID, "stroke-width": 1 }));
    svg.appendChild(text(ml - 8, y + 4, fmt(v), { "text-anchor": "end", class: "axis num" }));
  }
  const xAt = (i: number) => ml + (rows.length <= 1 ? pw / 2 : (i / (rows.length - 1)) * pw);
  const yAt = (v: number) => mt + ph - (v / niceMax) * ph;
  const d = (field: "a" | "b") => rows.map((r, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(2)},${yAt(r[field]).toFixed(2)}`).join(" ");
  svg.appendChild(path(d("a"), { fill: "none", stroke: C_ACCENT, "stroke-width": 2.5 }));
  svg.appendChild(path(d("b"), { fill: "none", stroke: C_INK, "stroke-width": 2.5 }));
  const labelEvery = Math.max(1, Math.ceil(rows.length / 10));
  rows.forEach((row, i) => {
    if (i % labelEvery === 0) svg.appendChild(text(xAt(i), H - mb + 18, row.label ?? row.key, { "text-anchor": "middle", class: "axis num" }));
  });
  const last = rows[rows.length - 1];
  if (last) {
    attachHover(svg.appendChild(rect(W - mr - 1, yAt(last.a) - 5, 1, 10, { fill: C_ACCENT })), `${aName}: ${fmt(last.a)}`);
    attachHover(svg.appendChild(rect(W - mr - 1, yAt(last.b) - 5, 1, 10, { fill: C_INK })), `${bName}: ${fmt(last.b)}`);
  }
  svg.appendChild(text(ml, 14, title, { class: "axis-label" }));
  svg.appendChild(text(W - mr - 152, 14, aName, { fill: C_ACCENT, "font-weight": 700 }));
  svg.appendChild(text(W - mr - 82, 14, bName, { fill: C_INK, "font-weight": 700 }));
  return svg;
}

function renderLorenzSvg(a: UserBundle, b: UserBundle): SVGSVGElement {
  const W = 520, H = 320, ml = 48, mr = 22, mt = 28, mb = 42;
  const pw = W - ml - mr, ph = H - mt - mb;
  const svg = mkSvg(W, H);
  svg.appendChild(rect(ml, mt, pw, ph, { fill: "#fff", stroke: C_RULE }));
  for (let i = 1; i < 5; i++) {
    const x = ml + pw * i / 5;
    const y = mt + ph * i / 5;
    svg.appendChild(line(x, mt, x, mt + ph, { stroke: C_GRID, "stroke-width": 1 }));
    svg.appendChild(line(ml, y, ml + pw, y, { stroke: C_GRID, "stroke-width": 1 }));
  }
  const xAt = (x: number) => ml + x * pw;
  const yAt = (y: number) => mt + ph - y * ph;
  const d = (rows: { x: number; y: number }[]) => `M${xAt(0)},${yAt(0)} ` + rows.map((r) => `L${xAt(r.x).toFixed(2)},${yAt(r.y).toFixed(2)}`).join(" ") + ` L${xAt(1)},${yAt(1)}`;
  svg.appendChild(path(d(a.data.lorenz), { fill: "none", stroke: C_ACCENT, "stroke-width": 2.5 }));
  svg.appendChild(path(d(b.data.lorenz), { fill: "none", stroke: C_INK, "stroke-width": 2.5 }));
  svg.appendChild(line(ml, mt + ph, ml + pw, mt, { stroke: C_RULE, "stroke-width": 1.5, "stroke-dasharray": "4 4" }));
  svg.appendChild(text(ml, 14, "ARTIST CONCENTRATION CURVE", { class: "axis-label" }));
  svg.appendChild(text(ml + pw / 2, H - 8, "SHARE OF ARTISTS", { "text-anchor": "middle", class: "axis-label" }));
  svg.appendChild(text(8, mt + ph / 2, "SHARE OF HOURS", { transform: `rotate(-90 8 ${mt + ph / 2})`, "text-anchor": "middle", class: "axis-label" }));
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

  const score = advancedCompatibility(a.data, b.data);
  const artistOverlap = overlapArtists(a.data, b.data);
  const trackOverlap = overlapTracks(a.data, b.data);
  const albumOverlap = topAlbumsOverlap(a.data, b.data);
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
        <div><b>${pct(score.weekday)}</b><span>weekday similarity</span></div>
        <div><b>${pct(score.platform)}</b><span>platform similarity</span></div>
        <div><b>${pct(score.shuffle)}</b><span>shuffle similarity</span></div>
        <div><b>${pct(score.skip)}</b><span>skip similarity</span></div>
        <div><b>${pct(score.discovery)}</b><span>discovery similarity</span></div>
        <div><b>${pct(score.concentration)}</b><span>artist concentration</span></div>
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

    <section class="viz-card" id="month-chart">
      <header><h2>Month-by-month Hours</h2><p class="subtitle">absolute monthly listening hours</p></header>
    </section>

    <section class="viz-card" id="cumulative-chart">
      <header><h2>Cumulative Listening Curves</h2><p class="subtitle">running total hours over time</p></header>
    </section>

    <section class="compare-grid">
      <div class="viz-card compare-panel">
        <header><h2>Weekday Distribution</h2><p class="subtitle">share of listening hours</p></header>
        <div class="compare-bars">${renderComparisonBars(weekdayRows(a.data, b.data), a.user.display, b.user.display)}</div>
      </div>
      <div class="viz-card compare-panel">
        <header><h2>Platform Share</h2><p class="subtitle">share of listening hours by platform</p></header>
        <div class="compare-bars">${renderComparisonBars(platformRows(a.data, b.data), a.user.display, b.user.display)}</div>
      </div>
    </section>

    <section class="compare-grid">
      <div class="viz-card compare-panel">
        <header><h2>Shuffle vs Intentional</h2><p class="subtitle">share of playback hours</p></header>
        <div class="compare-bars">${renderComparisonBars(shuffleRows(a.data, b.data), a.user.display, b.user.display)}</div>
      </div>
      <div class="viz-card compare-panel">
        <header><h2>Skip Behavior</h2><p class="subtitle">global skip stats</p></header>
        <div class="compare-bars">${renderComparisonBars(skipRows(a.data, b.data), a.user.display, b.user.display)}</div>
      </div>
    </section>

    <section class="compare-grid">
      <div class="viz-card compare-panel">
        <header><h2>Discovery / New Artists</h2><p class="subtitle">first-play based artist discovery</p></header>
        <div class="compare-bars">${renderComparisonBars(discoveryRows(a.data, b.data), a.user.display, b.user.display)}</div>
      </div>
      <div class="viz-card compare-panel">
        <header><h2>Day-length Distribution</h2><p class="subtitle">share of active listening days by bucket</p></header>
        <div class="compare-bars">${renderComparisonBars(dayHistRows(a.data, b.data), a.user.display, b.user.display)}</div>
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
        <header><h2>Top Albums Overlap</h2><p class="subtitle">shared top-${TOP_N} albums</p></header>
        ${overlapList(albumOverlap, a.user.display, b.user.display, "No shared top albums in the compared range.")}
      </div>
      <div class="viz-card compare-panel">
        <header><h2>Common Artists Weighted by Hours</h2><p class="subtitle">shared artists sorted by combined hours</p></header>
        ${overlapList(commonWeighted(artistOverlap, "hours"), a.user.display, b.user.display, "No shared top artists in the compared range.")}
      </div>
    </section>

    <section class="viz-card">
      <header><h2>Common Tracks Weighted by Plays</h2><p class="subtitle">shared tracks sorted by combined play count</p></header>
      ${overlapList(commonWeighted(trackOverlap, "plays"), a.user.display, b.user.display, "No shared top tracks in the compared range.")}
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

    <section class="compare-grid">
      <div class="viz-card compare-panel" id="genre-diversity-chart">
        <header><h2>Genre Diversity by Year</h2><p class="subtitle">unique enriched genres heard each year</p></header>
      </div>
      <div class="viz-card compare-panel">
        <header><h2>Top Genres Side-by-side</h2><p class="subtitle">top genre hour share among enriched plays</p></header>
        <div class="compare-bars">${renderComparisonBars(topGenreRows(a.data, b.data), a.user.display, b.user.display)}</div>
      </div>
    </section>

    <section class="compare-grid">
      <div class="viz-card compare-panel" id="lorenz-chart">
        <header><h2>Top Artist Concentration</h2><p class="subtitle">Lorenz-style artist hour curve</p></header>
      </div>
      <div class="viz-card compare-panel">
        <header><h2>Concentration Summary</h2><p class="subtitle">share of hours in top artists</p></header>
        <div class="compare-bars">${renderComparisonBars(concentrationRows(a.data, b.data), a.user.display, b.user.display)}</div>
      </div>
    </section>

    <section class="compare-grid">
      <div class="viz-card compare-panel">
        <header><h2>Session Metrics</h2><p class="subtitle">session counts, length, and peaks</p></header>
        <div class="compare-bars">${renderComparisonBars(sessionRows(a.data, b.data), a.user.display, b.user.display)}</div>
      </div>
      <div class="viz-card compare-panel">
        <header><h2>Records / Extremes</h2><p class="subtitle">largest days, months, streaks, and gaps</p></header>
        ${renderMetricTable(recordRows(a.data, b.data), a.user.display, b.user.display)}
      </div>
    </section>

    <section class="compare-grid">
      <div class="viz-card compare-panel">
        <header><h2>Biggest Deltas by Year</h2><p class="subtitle">largest absolute hour gaps</p></header>
        ${renderMetricTable(yearlyDeltaRows(a.data, b.data), a.user.display, b.user.display)}
      </div>
      <div class="viz-card compare-panel">
        <header><h2>Biggest Deltas by Month</h2><p class="subtitle">largest absolute hour gaps</p></header>
        ${renderMetricTable(monthlyDeltaRows(a.data, b.data), a.user.display, b.user.display)}
      </div>
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
  app.querySelector("#month-chart")!.appendChild(renderPairedBarSvg(rowsFromUnion(a.data.yearMonth, b.data.yearMonth), a.user.display, b.user.display, "HOURS PER MONTH"));
  app.querySelector("#cumulative-chart")!.appendChild(renderLineSvg(cumulativeRows(a.data, b.data), a.user.display, b.user.display, "CUMULATIVE HOURS"));
  app.querySelector("#genre-diversity-chart")!.appendChild(renderLineSvg(genreDiversityRows(a.data, b.data), a.user.display, b.user.display, "GENRES PER YEAR", (n) => String(Math.round(n))));
  app.querySelector("#lorenz-chart")!.appendChild(renderLorenzSvg(a, b));
  app.querySelector("#clock-diff")!.appendChild(renderClockDiffSvg(a, b));
}

main();
