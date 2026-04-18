// Read raw Spotify Extended Streaming History → emit compact data for viz.
// Output: public/data.json
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const RAW_DIR = path.join(ROOT, "data/raw/Spotify Extended Streaming History");
const OUT_DIR = path.join(ROOT, "public");
const OUT_FILE = path.join(OUT_DIR, "data.json");

const MIN_MS = 30_000;

function normPlatform(p) {
  if (!p) return "unknown";
  const s = p.toLowerCase();
  if (s.includes("android")) return "Android";
  if (s.includes("ios") || s.includes("iphone") || s.includes("ipad")) return "iOS";
  if (s.includes("windows")) return "Windows";
  if (s.includes("mac os") || s.includes("osx") || s.includes("darwin")) return "macOS";
  if (s.includes("webplayer") || s.includes("partner")) return "Web";
  if (s.includes("chromecast") || s.includes("cast")) return "Cast";
  if (s.includes("sonos")) return "Sonos";
  if (s.includes("playstation") || s.includes("ps4") || s.includes("ps5")) return "PlayStation";
  if (s.includes("tv")) return "TV";
  return "other";
}

async function main() {
  if (!existsSync(RAW_DIR)) {
    console.error(`Raw dir missing: ${RAW_DIR}`);
    process.exit(1);
  }
  const files = (await readdir(RAW_DIR)).filter((f) => f.startsWith("Streaming_History_Audio") && f.endsWith(".json"));
  files.sort();
  console.log(`Found ${files.length} audio history files`);

  const plays = [];
  let totalRows = 0;
  for (const f of files) {
    const raw = JSON.parse(await readFile(path.join(RAW_DIR, f), "utf8"));
    for (const r of raw) {
      totalRows++;
      const track = r.master_metadata_track_name;
      const artist = r.master_metadata_album_artist_name;
      if (!track || !artist) continue;
      plays.push({
        ts: r.ts,
        ms: r.ms_played || 0,
        a: artist,
        t: track,
        al: r.master_metadata_album_album_name || "",
        pf: normPlatform(r.platform),
        cc: r.conn_country || "",
        sh: r.shuffle ? 1 : 0,
        sk: r.skipped ? 1 : 0,
        rs: r.reason_start || "",
        re: r.reason_end || "",
        inc: r.incognito_mode ? 1 : 0,
        off: r.offline ? 1 : 0,
      });
    }
  }
  plays.sort((x, y) => x.ts.localeCompare(y.ts));
  const fullPlays = plays.filter((p) => p.ms >= MIN_MS);
  console.log(`Parsed ${totalRows} rows → ${plays.length} audio plays (${fullPlays.length} full ≥30s)`);

  // --- artist aggregates ---
  const artistPlays = new Map();
  const artistMs = new Map();
  const artistSkips = new Map();
  const artistAny = new Map();
  const artistAnyMs = new Map();
  const artistFirst = new Map();
  const artistLast = new Map();
  for (const p of plays) {
    artistAny.set(p.a, (artistAny.get(p.a) || 0) + 1);
    artistAnyMs.set(p.a, (artistAnyMs.get(p.a) || 0) + p.ms);
    if (p.sk) artistSkips.set(p.a, (artistSkips.get(p.a) || 0) + 1);
    if (!artistFirst.has(p.a)) artistFirst.set(p.a, p.ts);
    artistLast.set(p.a, p.ts);
    if (p.ms >= MIN_MS) {
      artistPlays.set(p.a, (artistPlays.get(p.a) || 0) + 1);
      artistMs.set(p.a, (artistMs.get(p.a) || 0) + p.ms);
    }
  }

  const topArtists = [...artistPlays.entries()]
    .map(([a, plays]) => ({
      a, plays,
      ms: artistMs.get(a) || 0,
      first: artistFirst.get(a),
      last: artistLast.get(a),
      skips: artistSkips.get(a) || 0,
      exposures: artistAny.get(a) || 0,
    }))
    .sort((x, y) => y.plays - x.plays)
    .slice(0, 100);

  // tracks
  const trackKey = (p) => `${p.a}\u0000${p.t}`;
  const trackPlays = new Map();
  const trackMs = new Map();
  for (const p of fullPlays) {
    const k = trackKey(p);
    trackPlays.set(k, (trackPlays.get(k) || 0) + 1);
    trackMs.set(k, (trackMs.get(k) || 0) + p.ms);
  }
  const topTracks = [...trackPlays.entries()]
    .map(([k, plays]) => {
      const [a, t] = k.split("\u0000");
      return { a, t, plays, ms: trackMs.get(k) || 0 };
    })
    .sort((x, y) => y.plays - x.plays)
    .slice(0, 60);

  // albums
  const albumKey = (p) => `${p.a}\u0000${p.al}`;
  const albumPlays = new Map();
  const albumMs = new Map();
  for (const p of fullPlays) {
    if (!p.al) continue;
    const k = albumKey(p);
    albumPlays.set(k, (albumPlays.get(k) || 0) + 1);
    albumMs.set(k, (albumMs.get(k) || 0) + p.ms);
  }
  const topAlbums = [...albumPlays.entries()]
    .map(([k, plays]) => {
      const [a, al] = k.split("\u0000");
      return { a, al, plays, ms: albumMs.get(k) || 0 };
    })
    .sort((x, y) => y.ms - x.ms)
    .slice(0, 30);

  // clock 7×24 (ms)
  const clock = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const p of fullPlays) {
    const d = new Date(p.ts);
    const dow = (d.getUTCDay() + 6) % 7;
    const hr = d.getUTCHours();
    clock[dow][hr] += p.ms;
  }

  // weekday totals (ms + plays across all time, Mo=0..So=6)
  const weekday = Array.from({ length: 7 }, () => ({ ms: 0, plays: 0 }));
  for (const p of fullPlays) {
    const d = new Date(p.ts);
    const dow = (d.getUTCDay() + 6) % 7;
    weekday[dow].ms += p.ms;
    weekday[dow].plays += 1;
  }

  // per-day totals — use MERGED INTERVALS so parallel streams don't double-count
  // (Spotify can stream on 2 devices at once; raw ms_played summed gives >24h/day)
  const dayBuckets = new Map(); // date -> [[startMs, endMs], ...]
  const dayPlays = new Map();
  const dayRawMs = new Map();
  for (const p of fullPlays) {
    const d = p.ts.slice(0, 10);
    const end = new Date(p.ts).getTime();
    const start = end - p.ms;
    if (!dayBuckets.has(d)) dayBuckets.set(d, []);
    dayBuckets.get(d).push([start, end]);
    dayPlays.set(d, (dayPlays.get(d) || 0) + 1);
    dayRawMs.set(d, (dayRawMs.get(d) || 0) + p.ms);
  }
  function mergeIntervals(ivs) {
    ivs.sort((a, b) => a[0] - b[0]);
    let total = 0;
    let [s, e] = ivs[0];
    for (let i = 1; i < ivs.length; i++) {
      const [ns, ne] = ivs[i];
      if (ns <= e) e = Math.max(e, ne);
      else { total += e - s; [s, e] = [ns, ne]; }
    }
    total += e - s;
    return Math.min(total, 86400_000); // cap at 24h safety
  }
  const dayArr = [...dayBuckets.entries()]
    .map(([d, ivs]) => ({
      d,
      ms: mergeIntervals(ivs),
      plays: dayPlays.get(d) || 0,
      rawMs: dayRawMs.get(d) || 0,
    }))
    .sort((a, b) => a.d.localeCompare(b.d));

  // year × month — derived from merged day-ms
  const ymMs = new Map();
  const ymPlays = new Map();
  for (const rec of dayArr) {
    const ym = rec.d.slice(0, 7);
    ymMs.set(ym, (ymMs.get(ym) || 0) + rec.ms);
    ymPlays.set(ym, (ymPlays.get(ym) || 0) + rec.plays);
  }
  const yearMonthArr = [...ymMs.entries()]
    .map(([ym, ms]) => ({ ym, ms, plays: ymPlays.get(ym) || 0 }))
    .sort((a, b) => a.ym.localeCompare(b.ym));

  // hours per year — artist counts from raw plays, ms from merged day totals
  const hoursPerYear = new Map();
  for (const p of fullPlays) {
    const y = p.ts.slice(0, 4);
    if (!hoursPerYear.has(y)) hoursPerYear.set(y, { ms: 0, plays: 0, artists: new Set() });
    const rec = hoursPerYear.get(y);
    rec.plays += 1;
    rec.artists.add(p.a);
  }
  for (const rec of dayArr) {
    const y = rec.d.slice(0, 4);
    if (hoursPerYear.has(y)) hoursPerYear.get(y).ms += rec.ms;
  }
  const yearArr = [...hoursPerYear.entries()]
    .map(([y, v]) => ({ y, ms: v.ms, plays: v.plays, artists: v.artists.size }))
    .sort((a, b) => a.y.localeCompare(b.y));

  // platforms per year (plays + ms)
  const platYearP = new Map();
  const platYearMs = new Map();
  const platforms = new Set();
  const years = new Set();
  for (const p of fullPlays) {
    const y = p.ts.slice(0, 4);
    years.add(y);
    platforms.add(p.pf);
    const k = `${y}\u0000${p.pf}`;
    platYearP.set(k, (platYearP.get(k) || 0) + 1);
    platYearMs.set(k, (platYearMs.get(k) || 0) + p.ms);
  }
  const platformStack = [];
  for (const y of [...years].sort()) {
    const row = { year: y };
    const rowMs = { year: y };
    for (const pf of platforms) {
      row[pf] = platYearP.get(`${y}\u0000${pf}`) || 0;
      rowMs[pf] = platYearMs.get(`${y}\u0000${pf}`) || 0;
    }
    row._ms = rowMs;
    platformStack.push(row);
  }

  // shuffle
  let shufP = 0, shufMs = 0, intP = 0, intMs = 0;
  for (const p of fullPlays) {
    if (p.sh) { shufP++; shufMs += p.ms; } else { intP++; intMs += p.ms; }
  }

  // skip rate (min 25 exp)
  const skipRate = [...artistAny.entries()]
    .map(([a, exp]) => ({
      a, exp,
      skips: artistSkips.get(a) || 0,
      ms: artistMs.get(a) || 0,
      plays: artistPlays.get(a) || 0,
    }))
    .filter((x) => x.exp >= 25)
    .map((x) => ({ ...x, rate: x.skips / x.exp }))
    .sort((x, y) => y.rate - x.rate)
    .slice(0, 30);

  // loyalty stripes
  const months = [];
  {
    const first = yearMonthArr[0]?.ym;
    const last = yearMonthArr[yearMonthArr.length - 1]?.ym;
    if (first && last) {
      let [y, m] = first.split("-").map(Number);
      const [ly, lm] = last.split("-").map(Number);
      while (y < ly || (y === ly && m <= lm)) {
        months.push(`${y}-${String(m).padStart(2, "0")}`);
        m++;
        if (m > 12) { m = 1; y++; }
      }
    }
  }
  const loyalty = topArtists.slice(0, 30).map((a) => {
    const set = new Set();
    for (const p of fullPlays) if (p.a === a.a) set.add(p.ts.slice(0, 7));
    return { a: a.a, active: months.map((m) => (set.has(m) ? 1 : 0)) };
  });

  // countries (plays + ms)
  const countriesP = new Map();
  const countriesMs = new Map();
  for (const p of fullPlays) {
    if (!p.cc) continue;
    countriesP.set(p.cc, (countriesP.get(p.cc) || 0) + 1);
    countriesMs.set(p.cc, (countriesMs.get(p.cc) || 0) + p.ms);
  }
  const countryArr = [...countriesP.entries()]
    .map(([cc, n]) => ({ cc, n, ms: countriesMs.get(cc) || 0 }))
    .sort((a, b) => b.n - a.n);

  // sessions (<10min gap)
  const SESSION_GAP_MS = 10 * 60 * 1000;
  const sessionLengths = [];
  const sessionDurations = [];
  const sessionStartHours = []; // hour-of-day of session start
  const sessionsByStartHour = Array.from({ length: 24 }, () => ({ count: 0, sumTracks: 0, sumMs: 0 }));
  let sessionCount = 0;
  let sessionMs = 0;
  let sessionStart = null;
  let lastEnd = 0;
  for (const p of fullPlays) {
    const t = new Date(p.ts).getTime();
    if (t - lastEnd > SESSION_GAP_MS) {
      if (sessionCount > 0) {
        sessionLengths.push(sessionCount);
        sessionDurations.push(sessionMs);
        const sh = new Date(sessionStart).getUTCHours();
        sessionStartHours.push(sh);
        sessionsByStartHour[sh].count += 1;
        sessionsByStartHour[sh].sumTracks += sessionCount;
        sessionsByStartHour[sh].sumMs += sessionMs;
      }
      sessionCount = 1;
      sessionMs = p.ms;
      sessionStart = p.ts;
    } else {
      sessionCount++;
      sessionMs += p.ms;
    }
    lastEnd = t + p.ms;
  }
  if (sessionCount > 0) {
    sessionLengths.push(sessionCount);
    sessionDurations.push(sessionMs);
    const sh = new Date(sessionStart).getUTCHours();
    sessionStartHours.push(sh);
    sessionsByStartHour[sh].count += 1;
    sessionsByStartHour[sh].sumTracks += sessionCount;
    sessionsByStartHour[sh].sumMs += sessionMs;
  }
  const buckets = [1, 2, 3, 5, 10, 20, 40, 80, 160];
  const sessionHist = buckets.map((b, i) => {
    const next = buckets[i + 1] ?? Infinity;
    const label = next === Infinity ? `${b}+` : `${b}-${next - 1}`;
    const n = sessionLengths.filter((l) => l >= b && l < next).length;
    const ms = sessionLengths.reduce((s, l, idx) => (l >= b && l < next ? s + sessionDurations[idx] : s), 0);
    return { bucket: label, n, ms };
  });
  const sessionByHour = sessionsByStartHour.map((rec, h) => ({
    h,
    avgTracks: rec.count ? rec.sumTracks / rec.count : 0,
    avgMs: rec.count ? rec.sumMs / rec.count : 0,
    count: rec.count,
  }));

  // first plays gallery
  const firstPlays = topArtists.slice(0, 25)
    .map((a) => ({ a: a.a, first: a.first, plays: a.plays, ms: a.ms }))
    .sort((x, y) => x.first.localeCompare(y.first));

  // end reasons (plays + ms)
  const endP = new Map();
  const endMs = new Map();
  for (const p of fullPlays) {
    endP.set(p.re, (endP.get(p.re) || 0) + 1);
    endMs.set(p.re, (endMs.get(p.re) || 0) + p.ms);
  }
  const endReasonArr = [...endP.entries()]
    .map(([r, n]) => ({ r, n, ms: endMs.get(r) || 0 }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 12);

  // monthly cumulative ms (for "lifetime" line)
  let cum = 0;
  const cumulative = yearMonthArr.map((r) => {
    cum += r.ms;
    return { ym: r.ym, ms: cum };
  });

  // discovery: artists first heard per month
  const discByMonth = new Map();
  for (const [artist, firstTs] of artistFirst.entries()) {
    // only count artists with full plays (>= MIN_MS) → meaningful discovery
    if (!artistPlays.has(artist)) continue;
    const ym = firstTs.slice(0, 7);
    discByMonth.set(ym, (discByMonth.get(ym) || 0) + 1);
  }
  const discovery = months.map((m) => ({ ym: m, n: discByMonth.get(m) || 0 }));

  // Lorenz curve: concentration of listening across artists
  // x = cumulative share of artists, y = cumulative share of ms
  const artistMsSorted = [...artistMs.values()].sort((a, b) => a - b); // asc
  const totalArtistMs = artistMsSorted.reduce((s, v) => s + v, 0) || 1;
  const N = artistMsSorted.length;
  const lorenz = [];
  const LORENZ_POINTS = 60;
  for (let i = 0; i <= LORENZ_POINTS; i++) {
    const frac = i / LORENZ_POINTS;
    const idx = Math.floor(frac * N);
    let sum = 0;
    for (let k = 0; k < idx; k++) sum += artistMsSorted[k];
    lorenz.push({ x: frac, y: sum / totalArtistMs });
  }
  // key shares
  const shares = [];
  for (const pct of [0.01, 0.05, 0.1, 0.25, 0.5]) {
    const cut = Math.ceil(N * pct);
    let s = 0;
    for (let k = N - cut; k < N; k++) s += artistMsSorted[k];
    shares.push({ topPct: pct, shareOfMs: s / totalArtistMs });
  }

  // hours-per-day distribution
  const dayHourBuckets = [
    { min: 0.001, max: 0.25, label: "<15m" },
    { min: 0.25, max: 0.5, label: "15–30m" },
    { min: 0.5, max: 1, label: "30–60m" },
    { min: 1, max: 2, label: "1–2h" },
    { min: 2, max: 3, label: "2–3h" },
    { min: 3, max: 4, label: "3–4h" },
    { min: 4, max: 6, label: "4–6h" },
    { min: 6, max: 8, label: "6–8h" },
    { min: 8, max: Infinity, label: "8h+" },
  ];
  const dayHist = dayHourBuckets.map((b) => ({ bucket: b.label, n: 0, totalMs: 0 }));
  for (const rec of dayArr) {
    const h = rec.ms / 3600_000;
    const bi = dayHourBuckets.findIndex((b) => h >= b.min && h < b.max);
    if (bi >= 0) { dayHist[bi].n += 1; dayHist[bi].totalMs += rec.ms; }
  }
  const zeroDays = computeZeroDays(dayArr);

  // reason_start distribution
  const startP = new Map();
  for (const p of fullPlays) startP.set(p.rs, (startP.get(p.rs) || 0) + 1);
  const startReasonArr = [...startP.entries()]
    .map(([r, n]) => ({ r, n }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 10);

  // year-month grid reshaped: hour-of-day heatmap PER YEAR (small multiples) — 24h × years
  const yearHour = [...years].sort().map((y) => {
    const hours = Array(24).fill(0);
    for (const p of fullPlays) {
      if (p.ts.slice(0, 4) === y) hours[new Date(p.ts).getUTCHours()] += p.ms;
    }
    return { y, hours };
  });

  // ======================================================
  // RECORDS — crazy stats to highlight
  // ======================================================

  // longest day (ms)
  const longestDay = dayArr.reduce((best, d) => d.ms > best.ms ? d : best, { d: "", ms: 0, plays: 0 });

  // most plays in a single day
  const mostPlaysDay = dayArr.reduce((best, d) => d.plays > best.plays ? d : best, { d: "", ms: 0, plays: 0 });

  // longest streak of consecutive days with ≥1 play
  let streakBest = 0;
  let streakBestStart = "";
  let streakBestEnd = "";
  let curStart = "";
  let curLen = 0;
  let prevDate = null;
  for (const rec of dayArr) {
    const dt = new Date(rec.d);
    if (prevDate && (dt.getTime() - prevDate.getTime()) === 86400000) {
      curLen += 1;
    } else {
      curStart = rec.d;
      curLen = 1;
    }
    if (curLen > streakBest) {
      streakBest = curLen;
      streakBestStart = curStart;
      streakBestEnd = rec.d;
    }
    prevDate = dt;
  }

  // longest gap (days not listening)
  let gapBest = 0;
  let gapBestStart = "";
  let gapBestEnd = "";
  prevDate = null;
  for (const rec of dayArr) {
    const dt = new Date(rec.d);
    if (prevDate) {
      const diff = Math.floor((dt.getTime() - prevDate.getTime()) / 86400000) - 1;
      if (diff > gapBest) {
        gapBest = diff;
        gapBestStart = prevDate.toISOString().slice(0, 10);
        gapBestEnd = rec.d;
      }
    }
    prevDate = dt;
  }

  // longest session (ms + tracks) — reuse sessionDurations/sessionLengths
  let longestSessionMs = 0, longestSessionIdx = -1;
  for (let i = 0; i < sessionDurations.length; i++) {
    if (sessionDurations[i] > longestSessionMs) { longestSessionMs = sessionDurations[i]; longestSessionIdx = i; }
  }
  let longestSessionTracks = 0, longestSessionTracksIdx = -1;
  for (let i = 0; i < sessionLengths.length; i++) {
    if (sessionLengths[i] > longestSessionTracks) { longestSessionTracks = sessionLengths[i]; longestSessionTracksIdx = i; }
  }

  // biggest single-play ms (longest single track play)
  let maxSingleMs = 0, maxSingleTrack = "";
  for (const p of fullPlays) {
    if (p.ms > maxSingleMs) { maxSingleMs = p.ms; maxSingleTrack = `${p.t} · ${p.a}`; }
  }

  // most played track in a single day
  const dayTrack = new Map(); // "date|artist|track" -> count
  for (const p of fullPlays) {
    const k = `${p.ts.slice(0, 10)}|${p.a}|${p.t}`;
    dayTrack.set(k, (dayTrack.get(k) || 0) + 1);
  }
  let topRepeat = { k: "", n: 0 };
  for (const [k, n] of dayTrack.entries()) if (n > topRepeat.n) topRepeat = { k, n };
  const [repeatDate, repeatArtist, repeatTrack] = topRepeat.k.split("|");

  // most active hour overall (ms)
  const hourTotals = Array(24).fill(0);
  for (let d = 0; d < 7; d++) for (let h = 0; h < 24; h++) hourTotals[h] += clock[d][h];
  const peakHourIdx = hourTotals.indexOf(Math.max(...hourTotals));

  // dominant weekday
  const peakWeekdayIdx = weekday.map((x, i) => ({ i, ms: x.ms })).sort((a, b) => b.ms - a.ms)[0].i;

  // biggest month
  const biggestMonth = yearMonthArr.slice().sort((a, b) => b.ms - a.ms)[0];

  // biggest year
  const biggestYear = yearArr.slice().sort((a, b) => b.ms - a.ms)[0];

  // top artist overall (plays) and top artist by hours
  const topByPlays = topArtists[0];
  const topByHours = topArtists.slice().sort((a, b) => b.ms - a.ms)[0];

  // most skipped artist (absolute count)
  const mostSkipped = [...artistSkips.entries()]
    .map(([a, s]) => ({ a, s }))
    .sort((x, y) => y.s - x.s)[0];

  // first played ever
  const firstTrack = plays[0];

  const records = {
    longestDay,
    mostPlaysDay,
    longestStreak: { days: streakBest, start: streakBestStart, end: streakBestEnd },
    longestGap: { days: gapBest, start: gapBestStart, end: gapBestEnd },
    longestSession: {
      ms: longestSessionMs,
      tracks: longestSessionIdx >= 0 ? sessionLengths[longestSessionIdx] : 0,
    },
    longestSessionByTracks: {
      tracks: longestSessionTracks,
      ms: longestSessionTracksIdx >= 0 ? sessionDurations[longestSessionTracksIdx] : 0,
    },
    maxSingleMs: { ms: maxSingleMs, track: maxSingleTrack },
    repeatChampion: { date: repeatDate || "", artist: repeatArtist || "", track: repeatTrack || "", n: topRepeat.n },
    peakHour: { hour: peakHourIdx, ms: hourTotals[peakHourIdx] },
    peakWeekday: { idx: peakWeekdayIdx, ms: weekday[peakWeekdayIdx].ms },
    biggestMonth,
    biggestYear,
    topByPlays: { a: topByPlays?.a, plays: topByPlays?.plays, ms: topByPlays?.ms },
    topByHours: { a: topByHours?.a, plays: topByHours?.plays, ms: topByHours?.ms },
    mostSkipped: mostSkipped ? { a: mostSkipped.a, n: mostSkipped.s } : null,
    firstEver: firstTrack ? { ts: firstTrack.ts, artist: firstTrack.a, track: firstTrack.t } : null,
  };

  // totals
  const totals = {
    totalPlays: fullPlays.length,
    totalPartial: plays.length - fullPlays.length,
    totalMs: dayArr.reduce((s, d) => s + d.ms, 0),
    totalRawMs: fullPlays.reduce((s, p) => s + p.ms, 0),
    uniqueArtists: artistPlays.size,
    uniqueTracks: trackPlays.size,
    uniqueAlbums: albumPlays.size,
    firstPlay: plays[0]?.ts,
    lastPlay: plays[plays.length - 1]?.ts,
    years: [...years].sort(),
    platforms: [...platforms].sort(),
    incognitoPlays: fullPlays.filter((p) => p.inc).length,
    offlinePlays: fullPlays.filter((p) => p.off).length,
  };

  const data = {
    totals,
    records,
    topArtists,
    topTracks,
    topAlbums,
    clock,
    weekday,
    yearMonth: yearMonthArr,
    day: dayArr,
    hoursPerYear: yearArr,
    platformStack,
    platforms: [...platforms].sort(),
    shuffle: { shuffle: shufP, intentional: intP, shuffleMs: shufMs, intentionalMs: intMs },
    skipRate,
    loyalty: { months, rows: loyalty },
    countries: countryArr,
    sessions: { hist: sessionHist, total: sessionLengths.length, byHour: sessionByHour },
    firstPlays,
    endReasons: endReasonArr,
    startReasons: startReasonArr,
    cumulative,
    discovery,
    lorenz,
    lorenzShares: shares,
    dayHist,
    zeroDays,
    yearHour,
  };

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(data));
  const sizeKb = (JSON.stringify(data).length / 1024).toFixed(1);
  console.log(`Wrote ${OUT_FILE} (${sizeKb} KB)`);
  console.log(`Totals: ${totals.totalPlays} plays · ${totals.uniqueArtists} artists · ${totals.uniqueTracks} tracks · ${totals.uniqueAlbums} albums`);
}

function computeZeroDays(dayArr) {
  if (dayArr.length < 2) return 0;
  const first = new Date(dayArr[0].d).getTime();
  const last = new Date(dayArr[dayArr.length - 1].d).getTime();
  const spanDays = Math.floor((last - first) / 86400000) + 1;
  return spanDays - dayArr.length;
}

main().catch((e) => { console.error(e); process.exit(1); });
