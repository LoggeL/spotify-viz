import { fmtHours, fmtNum, type DataBundle } from "../lib/data";

interface Record {
  kind: string;
  headline: string;
  detail: string;
  tone?: "accent" | "warn" | "info";
}

const DAYS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

function ymLabel(ym: string): string {
  const [y, m] = ym.split("-");
  return `${["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"][Number(m) - 1]} ${y}`;
}

function dateLabel(iso: string): string {
  const d = new Date(iso);
  const months = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
  return `${d.getUTCDate()}. ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function renderRecords(data: DataBundle): HTMLElement {
  const r = data.records;
  const recs: Record[] = [
    {
      kind: "längster tag",
      headline: fmtHours(r.longestDay.ms),
      detail: `am ${dateLabel(r.longestDay.d)} — ${fmtNum(r.longestDay.plays)} plays`,
      tone: "accent",
    },
    {
      kind: "längste streak",
      headline: `${fmtNum(r.longestStreak.days)} Tage`,
      detail: `${dateLabel(r.longestStreak.start)} → ${dateLabel(r.longestStreak.end)}`,
      tone: "accent",
    },
    {
      kind: "längste session",
      headline: fmtHours(r.longestSession.ms),
      detail: `${fmtNum(r.longestSession.tracks)} tracks in einem zug`,
    },
    {
      kind: "meiste session-tracks",
      headline: `${fmtNum(r.longestSessionByTracks.tracks)} tracks`,
      detail: `in einer session — ${fmtHours(r.longestSessionByTracks.ms)}`,
    },
    {
      kind: "track-repeat-champion",
      headline: `${fmtNum(r.repeatChampion.n)}×`,
      detail: `${r.repeatChampion.track} · ${r.repeatChampion.artist} am ${dateLabel(r.repeatChampion.date)}`,
      tone: "warn",
    },
    {
      kind: "größtes monats-hoch",
      headline: fmtHours(r.biggestMonth.ms),
      detail: `im ${ymLabel(r.biggestMonth.ym)} — ${fmtNum(r.biggestMonth.plays)} plays`,
    },
    {
      kind: "größtes jahres-hoch",
      headline: fmtHours(r.biggestYear.ms),
      detail: `in ${r.biggestYear.y} — ${fmtNum(r.biggestYear.plays)} plays · ${fmtNum(r.biggestYear.artists)} artists`,
      tone: "accent",
    },
    {
      kind: "längste hör-pause",
      headline: `${fmtNum(r.longestGap.days)} Tage`,
      detail: `${dateLabel(r.longestGap.start)} → ${dateLabel(r.longestGap.end)}`,
      tone: "warn",
    },
    {
      kind: "peak-stunde",
      headline: `${String(r.peakHour.hour).padStart(2, "0")}:00`,
      detail: `${fmtHours(r.peakHour.ms)} an dieser uhrzeit (alle jahre)`,
    },
    {
      kind: "stärkster wochentag",
      headline: DAYS[r.peakWeekday.idx],
      detail: `${fmtHours(r.peakWeekday.ms)} insgesamt`,
    },
    {
      kind: "top-artist nach plays",
      headline: r.topByPlays.a,
      detail: `${fmtNum(r.topByPlays.plays)} plays · ${fmtHours(r.topByPlays.ms)}`,
      tone: "accent",
    },
    {
      kind: "top-artist nach stunden",
      headline: r.topByHours.a,
      detail: `${fmtHours(r.topByHours.ms)} · ${fmtNum(r.topByHours.plays)} plays`,
    },
    ...(r.mostSkipped ? [{
      kind: "höchste skip-rate",
      headline: r.mostSkipped.a,
      detail: `${(r.mostSkipped.rate * 100).toFixed(1)}% skips · ${fmtNum(r.mostSkipped.exp)} listens (min p25: ${fmtNum(r.mostSkipped.minExp)})`,
      tone: "warn" as const,
    }] : []),
    {
      kind: "längster einzel-play",
      headline: fmtHours(r.maxSingleMs.ms),
      detail: r.maxSingleMs.track,
    },
    ...(r.firstEver ? [{
      kind: "allererster play",
      headline: r.firstEver.track,
      detail: `${r.firstEver.artist} · ${dateLabel(r.firstEver.ts)}`,
      tone: "info" as const,
    }] : []),
  ];

  const grid = document.createElement("div");
  grid.className = "records";
  for (const rec of recs) {
    const card = document.createElement("div");
    card.className = `record${rec.tone ? " " + rec.tone : ""}`;
    card.innerHTML = `
      <div class="r-kind">${rec.kind}</div>
      <div class="r-headline">${escapeHtml(rec.headline)}</div>
      <div class="r-detail">${escapeHtml(rec.detail)}</div>
    `;
    grid.appendChild(card);
  }
  return grid;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
