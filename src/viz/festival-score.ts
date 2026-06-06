import { fmtHours, fmtNum, type DataBundle, type TopArtist } from "../lib/data";
import { acts, festivals, type Act, type Festival } from "../lib/festivals";
import { spotifySearchUrl } from "../lib/util";

type ActScore = Act & {
  spotifyArtist?: TopArtist;
  minutes: number;
  plays: number;
  hoursLabel: string;
  setMinutes?: number;
};

type FestivalScore = Festival & {
  acts: ActScore[];
  matchedActs: number;
  totalActs: number;
  totalMinutes: number;
  totalPlays: number;
  score: number;
  coverage: number;
  timedActs: number;
};

const STRIP_WORDS = /\b(live|dj set|b2b|feat|featuring|pres|presents|official|the)\b/g;

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\+/g, " and ")
    .replace(/\$oho/g, "soho")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(STRIP_WORDS, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function artistKeys(name: string): string[] {
  const base = normalize(name);
  const parts = base
    .split(/\s+(?:and|b2b|x)\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  return Array.from(new Set([base, ...parts].filter((p) => p.length >= 2)));
}

function parseMinutes(time?: string): number | null {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function setDurationMinutes(act: Act): number | undefined {
  const start = parseMinutes(act.start);
  const end = parseMinutes(act.end);
  if (start == null || end == null) return undefined;
  const adjustedEnd = end < start ? end + 24 * 60 : end;
  return Math.max(0, adjustedEnd - start);
}

function buildArtistIndex(topArtists: TopArtist[]): Map<string, TopArtist> {
  const index = new Map<string, TopArtist>();
  for (const artist of topArtists) {
    for (const key of artistKeys(artist.a)) {
      const existing = index.get(key);
      if (!existing || artist.ms > existing.ms) index.set(key, artist);
    }
  }
  return index;
}

function findArtist(index: Map<string, TopArtist>, actArtist: string): TopArtist | undefined {
  for (const key of artistKeys(actArtist)) {
    const exact = index.get(key);
    if (exact) return exact;
  }
  const keys = artistKeys(actArtist);
  for (const [spotifyKey, artist] of index) {
    if (keys.some((key) => key.length >= 4 && (spotifyKey.includes(key) || key.includes(spotifyKey)))) return artist;
  }
  return undefined;
}

function scoreFestivals(data: DataBundle): FestivalScore[] {
  const index = buildArtistIndex(data.topArtists);
  const maxArtistMinutes = Math.max(1, ...data.topArtists.map((a) => a.ms / 60_000));

  const rows = festivals.map((festival) => {
    const festivalActs = acts.filter((act) => act.festivalId === festival.id);
    const scoredActs = festivalActs.map((act) => {
      const spotifyArtist = findArtist(index, act.artist);
      const minutes = spotifyArtist ? spotifyArtist.ms / 60_000 : 0;
      return {
        ...act,
        spotifyArtist,
        minutes,
        plays: spotifyArtist?.plays ?? 0,
        hoursLabel: minutes > 0 ? fmtHours(minutes * 60_000) : "—",
        setMinutes: setDurationMinutes(act),
      };
    }).sort((a, b) => b.minutes - a.minutes || a.day.localeCompare(b.day) || (a.start ?? "").localeCompare(b.start ?? ""));

    const totalMinutes = scoredActs.reduce((sum, act) => sum + act.minutes, 0);
    const totalPlays = scoredActs.reduce((sum, act) => sum + act.plays, 0);
    const matchedActs = scoredActs.filter((act) => act.minutes > 0).length;
    const timedActs = scoredActs.filter((act) => act.setMinutes != null).length;
    const coverage = festivalActs.length ? matchedActs / festivalActs.length : 0;
    const headlinerPull = scoredActs.slice(0, 8).reduce((sum, act, i) => sum + Math.sqrt(act.minutes / maxArtistMinutes) * (1 - i * 0.06), 0);
    const depth = Math.sqrt(totalMinutes / maxArtistMinutes);
    const score = Math.round(Math.min(100, (headlinerPull * 14) + (depth * 7) + (coverage * 22)));

    return {
      ...festival,
      acts: scoredActs,
      matchedActs,
      totalActs: festivalActs.length,
      totalMinutes,
      totalPlays,
      score,
      coverage,
      timedActs,
    };
  });

  const bestMinutes = Math.max(1, ...rows.map((row) => row.totalMinutes));
  return rows
    .map((row) => ({ ...row, score: Math.max(row.score, Math.round((row.totalMinutes / bestMinutes) * 100)) }))
    .sort((a, b) => b.score - a.score || b.totalMinutes - a.totalMinutes);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]!));
}

function sourceBadge(source: Act["source"]): string {
  return source === "official-timetable" ? "timed" : "line-up";
}

export function renderFestivalScore(data: DataBundle): HTMLElement {
  const root = document.createElement("div");
  root.className = "festival-score";

  const scored = scoreFestivals(data);
  const selectedId = scored[0]?.id;

  root.innerHTML = `
    <div class="festival-score-hero">
      <div>
        <div class="eyebrow">festival match engine</div>
        <h3>${scored[0] ? escapeHtml(scored[0].name) : "Festival"} leads with ${scored[0]?.score ?? 0}/100</h3>
        <p>Scores use your Spotify artist minutes, act coverage, and lineup depth. Act tables are sorted by your listening minutes.</p>
      </div>
      <div class="festival-score-big mono">${scored[0]?.score ?? 0}</div>
    </div>
    <div class="festival-rank-grid"></div>
    <div class="festival-detail"></div>
  `;

  const rankGrid = root.querySelector<HTMLDivElement>(".festival-rank-grid")!;
  const detail = root.querySelector<HTMLDivElement>(".festival-detail")!;

  function drawDetail(id: string) {
    root.querySelectorAll<HTMLButtonElement>(".festival-rank-card").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.id === id);
    });
    const festival = scored.find((item) => item.id === id) ?? scored[0];
    const maxMinutes = Math.max(1, ...festival.acts.map((act) => act.minutes));
    const topActs = festival.acts.slice(0, 40);
    detail.innerHTML = `
      <div class="festival-detail-head">
        <div>
          <h3>${escapeHtml(festival.name)}</h3>
          <p>${escapeHtml(festival.place)} · ${escapeHtml(festival.dates)} · ${festival.matchedActs}/${festival.totalActs} matched acts · ${festival.timedActs} timed</p>
        </div>
        <a href="${festival.sourceUrl}" target="_blank" rel="noopener noreferrer">source ↗</a>
      </div>
      <div class="festival-act-list">
        ${topActs.map((act, index) => {
          const width = Math.max(2, (act.minutes / maxMinutes) * 100);
          const meta = [act.day, act.start && act.end ? `${act.start}–${act.end}` : "TBA", act.stage, act.setMinutes ? `${act.setMinutes} set-min` : null, sourceBadge(act.source)].filter(Boolean).join(" · ");
          return `
            <a class="festival-act-row" href="${spotifySearchUrl(act.artist)}" target="_blank" rel="noopener noreferrer">
              <span class="rank mono">${String(index + 1).padStart(2, "0")}</span>
              <span class="act-main">
                <span class="act-name">${escapeHtml(act.artist)}</span>
                <span class="act-meta">${escapeHtml(meta)}</span>
                <span class="act-bar"><span style="width:${width.toFixed(1)}%"></span></span>
              </span>
              <span class="act-minutes mono">${act.minutes > 0 ? `${Math.round(act.minutes).toLocaleString("de-DE")} min` : "—"}</span>
            </a>
          `;
        }).join("")}
      </div>
    `;
  }

  scored.forEach((festival) => {
    const btn = document.createElement("button");
    btn.className = "festival-rank-card";
    btn.dataset.id = festival.id;
    btn.innerHTML = `
      <div class="festival-rank-top">
        <span>${escapeHtml(festival.name)}</span>
        <strong class="mono">${festival.score}</strong>
      </div>
      <div class="festival-rank-bar"><span style="width:${festival.score}%"></span></div>
      <div class="festival-rank-meta">
        <span>${fmtHours(festival.totalMinutes * 60_000)}</span>
        <span>${fmtNum(festival.totalPlays)} plays</span>
        <span>${festival.matchedActs}/${festival.totalActs} acts</span>
      </div>
    `;
    btn.addEventListener("click", () => drawDetail(festival.id));
    rankGrid.appendChild(btn);
  });

  if (selectedId) drawDetail(selectedId);
  return root;
}
