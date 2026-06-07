import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const RAW_DIR = process.env.RAW_DIR || "data/raw-julian/Spotify Extended Streaming History";
const OUT_FILE = process.env.OUT_FILE || "public/julian/song-domino.json";
const MIN_MS = Number(process.env.MIN_MS || 30_000);

const DROP_QUALIFIER = /\b(remaster(?:ed)?|live|radio edit|edit|version|acoustic|instrumental|karaoke|sped up|slowed|feat\.?|featuring|with|from|mono|stereo|bonus|explicit)\b/i;

function normalizeTitle(value) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\([^)]*\)/g, (part) => DROP_QUALIFIER.test(part) ? " " : part)
    .replace(/\[[^\]]*\]/g, (part) => DROP_QUALIFIER.test(part) ? " " : part)
    .replace(/\s+-\s+.*$/g, (part) => DROP_QUALIFIER.test(part) ? " " : part)
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(the|a|an)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeArtist(value) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const files = (await readdir(RAW_DIR)).filter((f) => f.startsWith("Streaming_History_Audio") && f.endsWith(".json")).sort();
const edgeAgg = new Map();
let rows = 0;
let fullPlays = 0;

for (const file of files) {
  const data = JSON.parse(await readFile(path.join(RAW_DIR, file), "utf8"));
  for (const row of data) {
    rows += 1;
    const artist = row.master_metadata_album_artist_name;
    const title = row.master_metadata_track_name;
    const ms = row.ms_played || 0;
    if (!artist || !title || ms < MIN_MS) continue;
    const artistKey = normalizeArtist(artist);
    const titleKey = normalizeTitle(title);
    if (!artistKey || !titleKey) continue;
    fullPlays += 1;
    const key = `${artistKey}\u0000${titleKey}`;
    const existing = edgeAgg.get(key) || { artistKey, titleKey, artist, title, plays: 0, ms: 0 };
    existing.plays += 1;
    existing.ms += ms;
    if (artist.length < existing.artist.length) existing.artist = artist;
    if (title.length < existing.title.length) existing.title = title;
    edgeAgg.set(key, existing);
  }
}

const titleToArtists = new Map();
const artistToTitles = new Map();
for (const edge of edgeAgg.values()) {
  if (!titleToArtists.has(edge.titleKey)) titleToArtists.set(edge.titleKey, new Set());
  titleToArtists.get(edge.titleKey).add(edge.artistKey);
  if (!artistToTitles.has(edge.artistKey)) artistToTitles.set(edge.artistKey, new Set());
  artistToTitles.get(edge.artistKey).add(edge.titleKey);
}

const sharedTitles = new Set([...titleToArtists.entries()].filter(([, artists]) => artists.size >= 2).map(([title]) => title));
const connectable = [...edgeAgg.values()].filter((edge) => sharedTitles.has(edge.titleKey));

const artistLabel = new Map();
const titleLabel = new Map();
for (const edge of edgeAgg.values()) {
  if (!artistLabel.has(edge.artistKey) || edge.artist.length < artistLabel.get(edge.artistKey).length) artistLabel.set(edge.artistKey, edge.artist);
  if (!titleLabel.has(edge.titleKey) || edge.title.length < titleLabel.get(edge.titleKey).length) titleLabel.set(edge.titleKey, edge.title);
}

const artists = [...new Set(connectable.map((edge) => edge.artistKey))]
  .sort((a, b) => artistLabel.get(a).localeCompare(artistLabel.get(b)))
  .map((key) => ({ key, name: artistLabel.get(key) }));
const titles = [...sharedTitles]
  .filter((key) => connectable.some((edge) => edge.titleKey === key))
  .sort((a, b) => titleLabel.get(a).localeCompare(titleLabel.get(b)))
  .map((key) => ({ key, title: titleLabel.get(key), artists: titleToArtists.get(key).size }));

const edges = connectable
  .sort((a, b) => b.plays - a.plays || a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title))
  .map((edge) => ({ a: edge.artistKey, t: edge.titleKey, plays: edge.plays, ms: edge.ms }));

const continuationSongs = connectable.filter((edge) => [...artistToTitles.get(edge.artistKey)].some((title) => title !== edge.titleKey && sharedTitles.has(title))).length;

const out = {
  generatedAt: new Date().toISOString(),
  source: "julian Spotify Extended Streaming History",
  stats: {
    files: files.length,
    rows,
    fullPlays,
    uniqueArtistTitleSongs: edgeAgg.size,
    uniqueArtists: artistToTitles.size,
    uniqueTitles: titleToArtists.size,
    sharedTitles: sharedTitles.size,
    connectableSongs: connectable.length,
    connectableArtists: artists.length,
    continuationSongs,
  },
  artists,
  titles,
  edges,
};

await mkdir(path.dirname(OUT_FILE), { recursive: true });
await writeFile(OUT_FILE, JSON.stringify(out));
console.log(`Wrote ${OUT_FILE}: ${edges.length} connectable song edges, ${artists.length} artists, ${titles.length} shared titles`);
