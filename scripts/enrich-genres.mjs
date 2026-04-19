// Spotify genre enrichment for the top-N most-played artists via Client Credentials flow.
// Reads raw streaming history too, to aggregate genres × year/month.
// Caches artist→genres in public/artist-genres.json (skip API if present).
import { readFile, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA = process.env.DATA_FILE || path.join(ROOT, "public/data.json");
const CACHE = process.env.CACHE_FILE || path.join(ROOT, "public/artist-genres.json");
const ENV = path.join(ROOT, ".env");
const RAW_DIR = process.env.RAW_DIR || path.join(ROOT, "data/raw/Spotify Extended Streaming History");
const MIN_MS = 30_000;
// Default "effectively all": any artist with ≥1 play gets enriched.
// Override via env for faster re-runs on big datasets.
const ARTIST_POOL_SIZE = Number(process.env.ARTIST_POOL_SIZE || 50000);
const MIN_POOL_PLAYS = Number(process.env.MIN_POOL_PLAYS || 1);

async function loadEnv() {
  if (existsSync(ENV)) {
    const txt = await readFile(ENV, "utf8");
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)\s*$/i);
      if (m) process.env[m[1]] ||= m[2].replace(/^["']|["']$/g, "");
    }
  }
}

async function getToken(id, secret) {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`token failed: ${res.status} ${await res.text()}`);
  return (await res.json()).access_token;
}

async function spget(url, token) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 429) {
    const r = Number(res.headers.get("Retry-After") || "1");
    await new Promise((x) => setTimeout(x, r * 1000));
    return spget(url, token);
  }
  if (!res.ok) throw new Error(`${url}: ${res.status} ${await res.text()}`);
  return res.json();
}

// Walk raw plays, build [{a, uri, plays}] for top-N most-played artists (full plays only).
// Decoupled from data.topArtists (capped at 500) so we can enrich a larger pool than the bundle keeps.
async function buildArtistPool() {
  const files = (await readdir(RAW_DIR)).filter((f) => f.startsWith("Streaming_History_Audio") && f.endsWith(".json")).sort();
  const byArtist = new Map();
  for (const f of files) {
    const raw = JSON.parse(await readFile(path.join(RAW_DIR, f), "utf8"));
    for (const r of raw) {
      const a = r.master_metadata_album_artist_name;
      if (!a || !r.master_metadata_track_name) continue;
      if (!byArtist.has(a)) byArtist.set(a, { plays: 0, uri: null });
      const rec = byArtist.get(a);
      const uri = (r.spotify_track_uri || "").replace(/^spotify:track:/, "");
      if (uri && !rec.uri) rec.uri = uri;
      if ((r.ms_played || 0) >= MIN_MS) rec.plays++;
    }
  }
  return [...byArtist.entries()]
    .map(([a, v]) => ({ a, uri: v.uri, plays: v.plays }))
    .filter((x) => x.uri && x.plays >= MIN_POOL_PLAYS)
    .sort((a, b) => b.plays - a.plays)
    .slice(0, ARTIST_POOL_SIZE);
}

async function fetchGenresForPool(pool, existing) {
  const todo = pool.filter((p) => !(p.a in existing));
  if (!todo.length) return { map: existing, added: 0 };
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) throw new Error("SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET missing in .env");
  const token = await getToken(id, secret);

  const uris = todo.map((p) => p.uri);
  const uriToArtistId = new Map();
  for (let i = 0; i < uris.length; i += 50) {
    const chunk = uris.slice(i, i + 50);
    const r = await spget(`https://api.spotify.com/v1/tracks?ids=${chunk.join(",")}`, token);
    r.tracks.forEach((t, idx) => {
      if (t?.artists?.[0]?.id) uriToArtistId.set(chunk[idx], t.artists[0].id);
    });
    console.log(`  tracks ${Math.min(i + 50, uris.length)}/${uris.length}`);
  }

  const allIds = [...new Set(uriToArtistId.values())];
  const idToGenres = new Map();
  for (let i = 0; i < allIds.length; i += 50) {
    const chunk = allIds.slice(i, i + 50);
    const r = await spget(`https://api.spotify.com/v1/artists?ids=${chunk.join(",")}`, token);
    for (const a of r.artists) if (a?.id) idToGenres.set(a.id, a.genres || []);
    console.log(`  artists ${Math.min(i + 50, allIds.length)}/${allIds.length}`);
  }

  const map = { ...existing };
  for (const p of todo) {
    const aid = uriToArtistId.get(p.uri);
    map[p.a] = (aid ? idToGenres.get(aid) : []) || [];
  }
  return { map, added: todo.length };
}

function ymBetween(first, last) {
  const months = [];
  let [y, m] = first.split("-").map(Number);
  const [ly, lm] = last.split("-").map(Number);
  while (y < ly || (y === ly && m <= lm)) {
    months.push(`${y}-${String(m).padStart(2, "0")}`);
    m++; if (m > 12) { m = 1; y++; }
  }
  return months;
}

async function aggregateGenreTimeSeries(nameToGenres) {
  const files = (await readdir(RAW_DIR)).filter((f) => f.startsWith("Streaming_History_Audio") && f.endsWith(".json")).sort();
  const byYear = new Map(); // year -> Map<genre, {plays, ms}>
  const byMonth = new Map(); // ym -> Map<genre, plays>
  const firstHeard = new Map(); // genre -> earliest ts
  const byGenre = new Map(); // genre -> {plays, ms, artists:Set}
  const years = new Set();
  const diversityPerYear = new Map(); // year -> Set<genre>
  for (const f of files) {
    const raw = JSON.parse(await readFile(path.join(RAW_DIR, f), "utf8"));
    for (const r of raw) {
      if (!r.master_metadata_track_name || !r.master_metadata_album_artist_name) continue;
      if ((r.ms_played || 0) < MIN_MS) continue;
      const a = r.master_metadata_album_artist_name;
      const gens = nameToGenres[a];
      if (!gens || !gens.length) continue;
      const ms = r.ms_played;
      const year = r.ts.slice(0, 4);
      const ym = r.ts.slice(0, 7);
      years.add(year);
      if (!byYear.has(year)) byYear.set(year, new Map());
      if (!byMonth.has(ym)) byMonth.set(ym, new Map());
      if (!diversityPerYear.has(year)) diversityPerYear.set(year, new Set());
      const yMap = byYear.get(year);
      const mMap = byMonth.get(ym);
      const dSet = diversityPerYear.get(year);
      for (const g of gens) {
        dSet.add(g);
        if (!firstHeard.has(g) || r.ts < firstHeard.get(g)) firstHeard.set(g, r.ts);
        if (!byGenre.has(g)) byGenre.set(g, { plays: 0, ms: 0, artists: new Set() });
        const t = byGenre.get(g);
        t.plays += 1; t.ms += ms; t.artists.add(a);
        const yg = yMap.get(g) || { plays: 0, ms: 0 };
        yg.plays += 1; yg.ms += ms;
        yMap.set(g, yg);
        mMap.set(g, (mMap.get(g) || 0) + 1);
      }
    }
  }
  const yearsArr = [...years].sort();
  const topGenres = [...byGenre.entries()]
    .map(([g, v]) => ({ g, plays: v.plays, ms: v.ms, artists: v.artists.size, sampleArtists: [...v.artists].slice(0, 6) }))
    .sort((x, y) => y.plays - x.plays);

  // Stacked area data: top 12 genres, remaining bundled into "other"
  const TOP_STACK = 12;
  const topG = topGenres.slice(0, TOP_STACK).map((x) => x.g);
  const topSet = new Set(topG);
  const byYearStacked = yearsArr.map((y) => {
    const row = { year: y };
    const yMap = byYear.get(y);
    let other = 0;
    for (const [g, v] of yMap.entries()) {
      if (topSet.has(g)) row[g] = v.plays;
      else other += v.plays;
    }
    for (const g of topG) if (!(g in row)) row[g] = 0;
    row.other = other;
    return row;
  });

  // Top genre per year
  const topPerYear = yearsArr.map((y) => {
    const yMap = byYear.get(y) || new Map();
    const sorted = [...yMap.entries()].map(([g, v]) => ({ g, plays: v.plays, ms: v.ms })).sort((a, b) => b.plays - a.plays);
    return { year: y, rows: sorted.slice(0, 5) };
  });

  const diversity = yearsArr.map((y) => ({ year: y, n: diversityPerYear.get(y)?.size || 0 }));

  const firstHeardArr = topGenres.slice(0, 15).map((g) => ({
    g: g.g, first: firstHeard.get(g.g), plays: g.plays, ms: g.ms,
  })).sort((a, b) => a.first.localeCompare(b.first));

  // Peak month per top-15 genre: the month where this genre claimed the highest share
  // of that month's total genre-attributed plays. Requires ≥20 plays in the month
  // so very early, sparse months don't produce misleading 100%-share peaks.
  const ymList = [...byMonth.keys()].sort();
  const peakArr = topGenres.slice(0, 15).map((g) => {
    let best = { ym: null, share: 0, plays: 0 };
    for (const ym of ymList) {
      const mMap = byMonth.get(ym);
      if (!mMap) continue;
      let monthTotal = 0;
      for (const v of mMap.values()) monthTotal += v;
      if (monthTotal < 20) continue;
      const p = mMap.get(g.g) || 0;
      const share = p / monthTotal;
      if (share > best.share) best = { ym, share, plays: p };
    }
    return { g: g.g, ym: best.ym, share: best.share, plays: best.plays, totalPlays: g.plays };
  }).filter((x) => x.ym);

  // Per-genre yearly plays for the top 60 (used by treemap trend + streamgraph).
  // Kept compact: just an array aligned to yearsArr.
  const topNames = topGenres.slice(0, 60).map((x) => x.g);
  const yearlyByGenre = {};
  const yearTotals = yearsArr.map((y) => {
    const m = byYear.get(y) || new Map();
    let s = 0;
    for (const v of m.values()) s += v.plays;
    return s;
  });
  for (const name of topNames) {
    yearlyByGenre[name] = yearsArr.map((y) => byYear.get(y)?.get(name)?.plays || 0);
  }

  // Trend metric per genre: (share in latest year) − (avg share across earlier years).
  // Positive → growing; negative → declining. Scaled to roughly [-1, 1] for color mapping.
  const topWithTrend = topGenres.slice(0, 60).map((g) => {
    const ys = yearlyByGenre[g.g];
    const shares = ys.map((v, i) => (yearTotals[i] ? v / yearTotals[i] : 0));
    const lastShare = shares[shares.length - 1] ?? 0;
    const earlier = shares.slice(0, -1).filter((_, i) => yearTotals[i] > 0);
    const avgEarlier = earlier.length ? earlier.reduce((a, b) => a + b, 0) / earlier.length : 0;
    const delta = lastShare - avgEarlier;
    // normalise against total share so small genres aren’t flattened
    const trend = avgEarlier > 0.0001 ? delta / Math.max(avgEarlier, 0.005) : (lastShare > 0 ? 1 : 0);
    return { ...g, trend: Math.max(-1, Math.min(1, trend)), lastShare, avgEarlierShare: avgEarlier };
  });

  return {
    top: topWithTrend,
    stackedGenres: topG,
    byYearStacked,
    topPerYear,
    diversity,
    firstHeard: firstHeardArr,
    peak: peakArr,
    years: yearsArr,
    yearTotals,
    yearlyByGenre,
  };
}

async function main() {
  await loadEnv();
  const data = JSON.parse(await readFile(DATA, "utf8"));

  const pool = await buildArtistPool();
  console.log(`Artist pool: ${pool.length} candidates (top ${ARTIST_POOL_SIZE} by full plays, ≥${MIN_POOL_PLAYS} plays)`);

  let existing = {};
  if (existsSync(CACHE)) {
    existing = JSON.parse(await readFile(CACHE, "utf8"));
    console.log(`  Cache has ${Object.keys(existing).length} artists`);
  }
  const { map: nameToGenres, added } = await fetchGenresForPool(pool, existing);
  if (added > 0) {
    await writeFile(CACHE, JSON.stringify(nameToGenres));
    console.log(`  Fetched ${added} new artists → ${CACHE}`);
  } else {
    console.log(`  All pool artists already cached`);
  }
  const enriched = Object.values(nameToGenres).filter((g) => g.length).length;
  console.log(`Have genres for ${enriched} / ${Object.keys(nameToGenres).length} artists`);

  // attach to topArtists
  for (const a of data.topArtists) a.genres = nameToGenres[a.a] || [];

  // aggregate time series from raw
  console.log("Aggregating genre time series from raw plays…");
  const agg = await aggregateGenreTimeSeries(nameToGenres);

  const coveredPlays = data.topArtists.filter((a) => a.genres?.length).reduce((s, a) => s + a.plays, 0);
  const coveredMs = data.topArtists.filter((a) => a.genres?.length).reduce((s, a) => s + a.ms, 0);
  const totalTopPlays = data.topArtists.reduce((s, a) => s + a.plays, 0);
  const totalTopMs = data.topArtists.reduce((s, a) => s + a.ms, 0);

  data.genres = {
    ...agg,
    enriched,
    coveredPlays, coveredMs, totalTopPlays, totalTopMs,
    uniqueGenres: agg.top.length,
  };

  await writeFile(DATA, JSON.stringify(data));
  const sz = (JSON.stringify(data).length / 1024).toFixed(1);
  console.log(`\n✓ ${sz} KB · ${agg.top.length} unique genres · diversity ${agg.diversity.map(d=>`${d.year}:${d.n}`).join(" ")}`);
  console.log(`  Top: ${agg.top.slice(0, 10).map(g => g.g).join(", ")}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
