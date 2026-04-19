// Spotify genre enrichment for top-500 artists via Client Credentials flow.
// Reads raw streaming history too, to aggregate genres × year/month.
// Caches artist→genres in public/artist-genres.json (skip API if present).
import { readFile, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA = path.join(ROOT, "public/data.json");
const CACHE = path.join(ROOT, "public/artist-genres.json");
const ENV = path.join(ROOT, ".env");
const RAW_DIR = path.join(ROOT, "data/raw/Spotify Extended Streaming History");
const MIN_MS = 30_000;

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

async function fetchGenresFromSpotify(data) {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) throw new Error("SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET missing in .env");
  const token = await getToken(id, secret);

  const artists = data.topArtists.filter((a) => a.uri);
  const uris = artists.map((a) => a.uri);
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

  const nameToGenres = {};
  for (const a of data.topArtists) {
    const aid = uriToArtistId.get(a.uri);
    nameToGenres[a.a] = (aid ? idToGenres.get(aid) : []) || [];
  }
  return nameToGenres;
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

  // Stacked area data: top 10 genres, remaining bundled into "other"
  const TOP_STACK = 10;
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

  return {
    top: topGenres.slice(0, 60),
    stackedGenres: topG,
    byYearStacked,
    topPerYear,
    diversity,
    firstHeard: firstHeardArr,
  };
}

async function main() {
  await loadEnv();
  const data = JSON.parse(await readFile(DATA, "utf8"));

  let nameToGenres;
  if (existsSync(CACHE)) {
    console.log("Using cached artist→genres map from public/artist-genres.json");
    nameToGenres = JSON.parse(await readFile(CACHE, "utf8"));
  } else {
    console.log("Fetching genres from Spotify API…");
    nameToGenres = await fetchGenresFromSpotify(data);
    await writeFile(CACHE, JSON.stringify(nameToGenres));
    console.log(`  Cached to ${CACHE}`);
  }
  const enriched = Object.values(nameToGenres).filter((g) => g.length).length;
  console.log(`Have genres for ${enriched} artists`);

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
