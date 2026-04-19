export interface Totals {
  totalPlays: number;
  totalPartial: number;
  totalMs: number;
  uniqueArtists: number;
  uniqueTracks: number;
  uniqueAlbums: number;
  firstPlay: string;
  lastPlay: string;
  years: string[];
  platforms: string[];
  incognitoPlays: number;
  offlinePlays: number;
}

export interface TopArtist {
  a: string;
  plays: number;
  ms: number;
  first: string;
  last: string;
  skips: number;
  exposures: number;
  uri?: string;
  genres?: string[];
}
export interface TopTrack { a: string; t: string; plays: number; ms: number; }
export interface TopAlbum { a: string; al: string; plays: number; ms: number; }

export interface PlatformRow {
  year: string;
  _ms: Record<string, number | string>;
  [key: string]: string | number | Record<string, number | string>;
}

export interface SkipTrack { t: string; full: number; skip: number; }
export interface SkipArtist { a: string; exp: number; skips: number; plays: number; ms: number; skipMs: number; rate: number; avgSkipSec: number; topSkipTracks?: SkipTrack[]; }
export interface SkipStats { globalRate: number; globalSkips: number; globalExposures: number; avgSkipMs: number; }
export interface LoyaltyRow { a: string; active: number[]; }

export interface Records {
  longestDay: { d: string; ms: number; plays: number };
  mostPlaysDay: { d: string; ms: number; plays: number };
  longestStreak: { days: number; start: string; end: string };
  longestGap: { days: number; start: string; end: string };
  longestSession: { ms: number; tracks: number };
  longestSessionByTracks: { tracks: number; ms: number };
  maxSingleMs: { ms: number; track: string };
  repeatChampion: { date: string; artist: string; track: string; n: number };
  peakHour: { hour: number; ms: number };
  peakWeekday: { idx: number; ms: number };
  biggestMonth: { ym: string; ms: number; plays: number };
  biggestYear: { y: string; ms: number; plays: number; artists: number };
  topByPlays: { a: string; plays: number; ms: number };
  topByHours: { a: string; plays: number; ms: number };
  mostSkipped: { a: string; n: number } | null;
  firstEver: { ts: string; artist: string; track: string } | null;
}

export interface DataBundle {
  totals: Totals;
  records: Records;
  topArtists: TopArtist[];
  topTracks: TopTrack[];
  topAlbums: TopAlbum[];
  clock: number[][];
  weekday: { ms: number; plays: number }[];
  yearMonth: { ym: string; ms: number; plays: number }[];
  day: { d: string; ms: number; plays: number }[];
  hoursPerYear: { y: string; ms: number; plays: number; artists: number }[];
  platformStack: PlatformRow[];
  platforms: string[];
  shuffle: { shuffle: number; intentional: number; shuffleMs: number; intentionalMs: number };
  skipRate: SkipArtist[];
  skipStats?: SkipStats;
  loyalty: { months: string[]; rows: LoyaltyRow[] };
  countries: { cc: string; n: number; ms: number }[];
  sessions: {
    hist: { bucket: string; n: number; ms: number }[];
    total: number;
    byHour: { h: number; avgTracks: number; avgMs: number; count: number }[];
  };
  firstPlays: { a: string; first: string; plays: number; ms: number }[];
  endReasons: { r: string; n: number; ms: number }[];
  startReasons: { r: string; n: number }[];
  cumulative: { ym: string; ms: number }[];
  discovery: { ym: string; n: number }[];
  lorenz: { x: number; y: number }[];
  lorenzShares: { topPct: number; shareOfMs: number }[];
  dayHist: { bucket: string; n: number; totalMs: number }[];
  zeroDays: number;
  yearHour: { y: string; hours: number[] }[];
  songLength: { ym: string; avgMs: number; n: number }[];
  perYear: {
    y: string;
    artists: { a: string; plays: number; ms: number }[];
    tracks: { a: string; t: string; plays: number; ms: number }[];
  }[];
  genres?: {
    top: {
      g: string; plays: number; ms: number; artists: number; sampleArtists: string[];
      trend: number; lastShare: number; avgEarlierShare: number;
    }[];
    stackedGenres: string[];
    byYearStacked: ({ year: string; other: number } & Record<string, number | string>)[];
    topPerYear: { year: string; rows: { g: string; plays: number; ms: number }[] }[];
    diversity: { year: string; n: number }[];
    firstHeard: { g: string; first: string; plays: number; ms: number }[];
    peak: { g: string; ym: string; share: number; plays: number; totalPlays: number }[];
    years: string[];
    yearTotals: number[];
    yearlyByGenre: Record<string, number[]>;
    enriched: number;
    coveredPlays: number;
    coveredMs: number;
    totalTopPlays: number;
    totalTopMs: number;
    uniqueGenres: number;
  };
}

let cache: DataBundle | null = null;
export async function loadData(): Promise<DataBundle> {
  if (cache) return cache;
  const user = (window as unknown as { __SPOTIFY_VIZ_USER__?: string }).__SPOTIFY_VIZ_USER__;
  const base = import.meta.env.BASE_URL;
  const url = user ? `${base}${user}/data.json` : `${base}data.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`data.json fetch failed: ${res.status}`);
  cache = (await res.json()) as DataBundle;
  return cache;
}

export function fmtHours(ms: number): string {
  const h = ms / 3600_000;
  if (h >= 1) return `${h.toFixed(1)} h`;
  return `${(ms / 60_000).toFixed(0)} min`;
}

export function fmtHoursShort(ms: number): string {
  const h = ms / 3600_000;
  if (h >= 10) return `${h.toFixed(0)}h`;
  if (h >= 1) return `${h.toFixed(1)}h`;
  return `${(ms / 60_000).toFixed(0)}m`;
}

export function fmtNum(n: number): string {
  return n.toLocaleString("de-DE");
}
