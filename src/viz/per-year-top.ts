import { spotifySearchUrl } from "../lib/util";
import { fmtNum, fmtHours, type DataBundle } from "../lib/data";

// Interactive card: switch year, show top artists + top tracks of that year.
export function renderPerYearTop(data: DataBundle): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "per-year";

  if (!data.perYear || data.perYear.length === 0) {
    wrap.className = "status";
    wrap.textContent = "Keine per-year daten — run npm run preprocess.";
    return wrap;
  }

  const years = data.perYear.map((p) => p.y);
  const byYear = new Map(data.perYear.map((p) => [p.y, p]));

  // tabs
  const tabs = document.createElement("div");
  tabs.className = "per-year-tabs";
  wrap.appendChild(tabs);

  const grid = document.createElement("div");
  grid.className = "per-year-grid";
  wrap.appendChild(grid);

  let current = years[years.length - 1];

  const render = () => {
    tabs.querySelectorAll("button").forEach((b) => {
      b.classList.toggle("active", b.dataset.y === current);
    });
    grid.innerHTML = "";
    const y = byYear.get(current);
    if (!y) return;

    const totalArtistPlays = y.artists.reduce((s, a) => s + a.plays, 0);
    const totalTrackPlays = y.tracks.reduce((s, t) => s + t.plays, 0);

    const artistsCol = buildList(
      "TOP ARTISTS",
      `${Math.min(15, y.artists.length)} shown · ${fmtNum(totalArtistPlays)} plays`,
      y.artists.slice(0, 15).map((a, i) => ({
        rank: i + 1,
        name: a.a,
        plays: a.plays,
        ms: a.ms,
        max: y.artists[0]?.plays || 1,
        href: spotifySearchUrl(a.a),
      }))
    );

    const tracksCol = buildList(
      "TOP TRACKS",
      `${y.tracks.length} shown · ${fmtNum(totalTrackPlays)} plays`,
      y.tracks.map((t, i) => ({
        rank: i + 1,
        name: t.t,
        sub: t.a,
        plays: t.plays,
        ms: t.ms,
        max: y.tracks[0]?.plays || 1,
        href: spotifySearchUrl(`${t.a} ${t.t}`),
      }))
    );

    grid.appendChild(artistsCol);
    grid.appendChild(tracksCol);
  };

  years.forEach((y) => {
    const b = document.createElement("button");
    b.textContent = y;
    b.dataset.y = y;
    b.addEventListener("click", () => { current = y; render(); });
    tabs.appendChild(b);
  });

  render();
  return wrap;
}

interface Row {
  rank: number;
  name: string;
  sub?: string;
  plays: number;
  ms: number;
  max: number;
  href: string;
}

function buildList(title: string, caption: string, rows: Row[]): HTMLElement {
  const col = document.createElement("div");
  col.className = "per-year-col";

  const head = document.createElement("header");
  head.innerHTML = `<h3>${title}</h3><span class="cap">${caption}</span>`;
  col.appendChild(head);

  const list = document.createElement("ol");
  list.className = "per-year-list";
  for (const r of rows) {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = r.href;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    const pct = (r.plays / r.max) * 100;
    a.innerHTML = `
      <span class="rk">${String(r.rank).padStart(2, "0")}</span>
      <span class="nm">
        <span class="t1">${escapeHtml(r.name)}</span>
        ${r.sub ? `<span class="t2">${escapeHtml(r.sub)}</span>` : ""}
      </span>
      <span class="bar"><span class="bar-fill" style="width:${pct.toFixed(1)}%"></span></span>
      <span class="n">${fmtNum(r.plays)}</span>
      <span class="h">${fmtHours(r.ms)}</span>
    `;
    li.appendChild(a);
    list.appendChild(li);
  }
  col.appendChild(list);
  return col;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
