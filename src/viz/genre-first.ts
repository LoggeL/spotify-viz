import { mkSvg, circle, text, line, attachHover, C_INK, C_MUTED, C_GRID } from "../lib/util";
import { fmtNum, type DataBundle } from "../lib/data";

// Timeline of each top-15 genre's peak month (month where that genre's share
// of total monthly plays was highest).
export function renderGenreFirst(data: DataBundle): SVGSVGElement | HTMLElement {
  if (!data.genres || !(data.genres as unknown as { peak?: unknown }).peak) {
    const p = document.createElement("p");
    p.className = "status"; p.textContent = "Keine Genre-Daten.";
    return p;
  }
  const peak = (data.genres as unknown as {
    peak: { g: string; ym: string; share: number; plays: number; totalPlays: number }[];
  }).peak;
  const rows = [...peak].sort((a, b) => a.ym.localeCompare(b.ym));

  const W = 980;
  const rowH = 26;
  const marginT = 50;
  const marginL = 60;
  const marginR = 20;
  const H = marginT + rows.length * rowH + 20;
  const svg = mkSvg(W, H);

  const start = new Date(data.totals.firstPlay).getTime();
  const end = new Date(data.totals.lastPlay).getTime();
  const span = end - start || 1;
  const scale = (t: number) => marginL + ((t - start) / span) * (W - marginL - marginR);

  for (const y of data.totals.years) {
    const t = new Date(`${y}-01-01`).getTime();
    if (t < start || t > end) continue;
    const x = scale(t);
    svg.appendChild(line(x, 32, x, H - 10, {
      stroke: C_GRID, "stroke-width": 1, "stroke-dasharray": "2 2",
    }));
    svg.appendChild(text(x, 24, y, { "text-anchor": "middle", class: "axis num" }));
  }
  svg.appendChild(line(marginL, 32, W - marginR, 32, { stroke: C_INK, "stroke-width": 1 }));

  rows.forEach((r, i) => {
    const t = new Date(`${r.ym}-01`).getTime();
    const x = scale(t);
    const y = marginT + i * rowH;
    svg.appendChild(line(x, 32, x, y, {
      stroke: C_MUTED, "stroke-width": 0.5, "stroke-dasharray": "1 2",
    }));
    const radius = Math.max(3, Math.min(3 + r.share * 60, 14));
    const dot = circle(x, y, radius, { fill: C_INK });
    attachHover(
      dot,
      `${r.g} — peak month ${r.ym} · ${(r.share * 100).toFixed(1)}% of that month's plays (${fmtNum(r.plays)} plays)`,
    );
    svg.appendChild(dot);
    svg.appendChild(text(
      x + radius + 4,
      y + 4,
      `${r.g} · peak ${r.ym} · ${(r.share * 100).toFixed(0)}% share`,
      { "font-size": 12 },
    ));
  });

  return svg;
}
