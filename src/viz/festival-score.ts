import { fmtHours, fmtNum, type DataBundle, type TopArtist } from "../lib/data";
import { festivalArtistIdentities } from "../lib/festival-artist-identities";
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

function normalizeArtistName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\bthe\b/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

type ArtistIndex = {
  bySpotifyId: Map<string, TopArtist>;
  byName: Map<string, TopArtist>;
};

function keepBest(index: Map<string, TopArtist>, key: string | undefined, artist: TopArtist) {
  if (!key) return;
  const existing = index.get(key);
  if (!existing || artist.ms > existing.ms) index.set(key, artist);
}

function buildArtistIndex(topArtists: TopArtist[]): ArtistIndex {
  const bySpotifyId = new Map<string, TopArtist>();
  const byName = new Map<string, TopArtist>();
  for (const artist of topArtists) {
    keepBest(bySpotifyId, artist.spotifyArtistId, artist);
    keepBest(byName, normalizeArtistName(artist.a), artist);
    keepBest(byName, artist.spotifyName ? normalizeArtistName(artist.spotifyName) : undefined, artist);
  }
  return { bySpotifyId, byName };
}

function findArtist(index: ArtistIndex, actArtist: string): TopArtist | undefined {
  const directNameMatch = index.byName.get(normalizeArtistName(actArtist));
  if (directNameMatch) return directNameMatch;

  const identity = festivalArtistIdentities[actArtist];
  if (identity) {
    return index.byName.get(normalizeArtistName(identity.name))
      ?? index.bySpotifyId.get(identity.spotifyArtistId);
  }

  return undefined;
}

function artistWasActiveInYear(artist: TopArtist, year: string): boolean {
  const start = `${year}-01-01`;
  const end = `${year}-12-31T23:59:59`;
  return artist.first <= end && artist.last >= start;
}

function artistSourceForMode(data: DataBundle, mode: string): TopArtist[] {
  if (mode === "all") return data.topArtists;

  const year = data.perYear.find((row) => row.y === mode);
  const yearlyByName = new Map((year?.artists ?? []).map((artist) => [normalizeArtistName(artist.a), artist]));

  return data.topArtists
    .filter((artist) => artistWasActiveInYear(artist, mode) || yearlyByName.has(normalizeArtistName(artist.a)))
    .map((artist) => {
      const yearly = yearlyByName.get(normalizeArtistName(artist.a));
      if (!yearly) return artist;

      return {
        ...artist,
        plays: yearly.plays,
        ms: yearly.ms,
        first: `${mode}-01-01`,
        last: `${mode}-12-31`,
        skips: 0,
        exposures: yearly.plays,
      };
    });
}

function scoreFestivals(data: DataBundle, mode = "all", includeArchived = false): FestivalScore[] {
  const sourceArtists = artistSourceForMode(data, mode);
  const index = buildArtistIndex(sourceArtists);
  const maxArtistMinutes = Math.max(1, ...sourceArtists.map((a) => a.ms / 60_000));

  const visibleFestivals = includeArchived ? festivals : festivals.filter((festival) => !festival.archived);

  const rows = visibleFestivals.map((festival) => {
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

  const years = data.perYear.map((row) => row.y).sort();
  const latestYear = years.at(-1) ?? data.totals.years.at(-1) ?? new Date().getFullYear().toString();
  let mode = "all";
  const includeArchived = new URLSearchParams(window.location.search).get("archive") === "1";
  let scored = scoreFestivals(data, mode, includeArchived);
  let selectedId = scored[0]?.id;

  root.innerHTML = `
    <div class="festival-score-hero">
      <div>
        <div class="eyebrow">festival match engine</div>
        <h3><span class="festival-leader-name">${scored[0] ? escapeHtml(scored[0].name) : "Festival"}</span> leads with <span class="festival-leader-score">${scored[0]?.score ?? 0}</span>/100</h3>
        <p>Scores use your Spotify artist minutes, act coverage, and lineup depth. Switch between lifetime taste and your latest listening year.${includeArchived ? " Archive view includes hidden past festivals." : ""}</p>
        <div class="festival-mode-toggle" role="group" aria-label="Festival scoring mode">
          <button class="active" data-mode="all" type="button">All time</button>
          <button data-mode="${latestYear}" type="button">${latestYear}</button>
        </div>
      </div>
      <div class="festival-score-big mono">${scored[0]?.score ?? 0}</div>
    </div>
    <div class="festival-rank-grid"></div>
    <div class="festival-detail"></div>
  `;

  const rankGrid = root.querySelector<HTMLDivElement>(".festival-rank-grid")!;
  const detail = root.querySelector<HTMLDivElement>(".festival-detail")!;
  const leaderName = root.querySelector<HTMLSpanElement>(".festival-leader-name")!;
  const leaderScore = root.querySelector<HTMLSpanElement>(".festival-leader-score")!;
  const bigScore = root.querySelector<HTMLDivElement>(".festival-score-big")!;

  function drawDetail(id: string) {
    root.querySelectorAll<HTMLButtonElement>(".festival-rank-card").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.id === id);
    });
    const festival = scored.find((item) => item.id === id) ?? scored[0];
    const maxMinutes = Math.max(1, ...festival.acts.map((act) => act.minutes));
    const matchedActs = festival.acts.filter((act) => act.minutes > 0);
    const unmatchedPreview = festival.acts.filter((act) => act.minutes <= 0).slice(0, Math.max(0, 40 - matchedActs.length));
    const topActs = [...matchedActs, ...unmatchedPreview];
    const hiddenActs = Math.max(0, festival.acts.length - topActs.length);
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
        ${hiddenActs ? `<div class="festival-act-row muted-row"><span></span><span>${hiddenActs} unmatched low-score acts hidden</span><span></span><span></span></div>` : ""}
      </div>
    `;
  }

  function drawRanks() {
    rankGrid.innerHTML = "";
    scored.forEach((festival) => {
      const btn = document.createElement("button");
      btn.className = "festival-rank-card";
      btn.dataset.id = festival.id;
      const matchedNames = festival.acts
        .filter((act) => act.minutes > 0)
        .slice(0, 6)
        .map((act) => act.artist)
        .join(", ");
      btn.innerHTML = `
        <div class="festival-rank-top">
          <span>${escapeHtml(festival.name)}${festival.archived ? " <small>archive</small>" : ""}</span>
          <strong class="mono">${festival.score}</strong>
        </div>
        <div class="festival-rank-bar"><span style="width:${festival.score}%"></span></div>
        <div class="festival-rank-meta">
          <span>${fmtHours(festival.totalMinutes * 60_000)}</span>
          <span>${fmtNum(festival.totalPlays)} plays</span>
          <span>${festival.matchedActs}/${festival.totalActs} acts</span>
        </div>
        <div class="festival-rank-preview">${matchedNames ? escapeHtml(matchedNames) : "No known acts yet"}</div>
      `;
      btn.addEventListener("click", () => {
        selectedId = festival.id;
        drawDetail(festival.id);
      });
      rankGrid.appendChild(btn);
    });
  }

  function setMode(nextMode: string) {
    mode = nextMode;
    scored = scoreFestivals(data, mode, includeArchived);
    selectedId = scored[0]?.id;
    const leader = scored[0];
    leaderName.textContent = leader?.name ?? "Festival";
    leaderScore.textContent = String(leader?.score ?? 0);
    bigScore.textContent = String(leader?.score ?? 0);
    root.querySelectorAll<HTMLButtonElement>(".festival-mode-toggle button").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.mode === mode);
    });
    drawRanks();
    if (selectedId) drawDetail(selectedId);
  }

  root.querySelectorAll<HTMLButtonElement>(".festival-mode-toggle button").forEach((btn) => {
    btn.addEventListener("click", () => setMode(btn.dataset.mode ?? "all"));
  });

  drawRanks();
  if (selectedId) drawDetail(selectedId);
  return root;
}
