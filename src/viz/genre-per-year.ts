import { mkSvg, rect, text, line, attachHover, PALETTE, C_RULE } from "../lib/util";
import { fmtHours, fmtNum, type DataBundle } from "../lib/data";

// Small multiples: for each year, top-5 genres ranked
export function renderGenrePerYear(data: DataBundle): SVGSVGElement | HTMLElement {
  if (!data.genres) {
    const p = document.createElement("p");
    p.className = "status"; p.textContent = "Keine Genre-Daten.";
    return p;
  }
  const years = data.genres.topPerYear;
  const cols = Math.min(years.length, 5);
  const rows = Math.ceil(years.length / cols);
  const cellW = 180;
  const cellH = 190;
  const gap = 20;
  const W = cols * cellW + (cols - 1) * gap + 40;
  const H = rows * cellH + (rows - 1) * gap + 40;
  const svg = mkSvg(W, H);

  // consistent color per genre (top genres from overall top list)
  const globalOrder = data.genres.stackedGenres;
  const colorMap = new Map<string, string>();
  globalOrder.forEach((g, i) => colorMap.set(g, PALETTE[i % PALETTE.length]));
  const colorFor = (g: string) => colorMap.get(g) || "#8a8578";

  years.forEach((y, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const cx = 20 + col * (cellW + gap);
    const cy = 20 + row * (cellH + gap);

    svg.appendChild(text(cx, cy + 12, y.year, {
      "font-size": 14, "font-weight": 600, class: "num",
    }));
    const total = y.rows.reduce((s, r) => s + r.plays, 0);
    svg.appendChild(text(cx + cellW - 4, cy + 12, `${fmtNum(total)}`, {
      "text-anchor": "end", "font-size": 10, fill: "#6b7380", class: "num",
    }));
    svg.appendChild(line(cx, cy + 18, cx + cellW, cy + 18, { stroke: C_RULE, "stroke-width": 1 }));

    const max = y.rows[0]?.plays || 1;
    const rowH = 30;
    y.rows.slice(0, 5).forEach((r, ri) => {
      const y2 = cy + 24 + ri * rowH;
      const label = r.g.length > 22 ? r.g.slice(0, 21) + "…" : r.g;
      svg.appendChild(text(cx, y2 + 10, label, { "font-size": 11 }));
      const bw = (r.plays / max) * cellW;
      const bar = rect(cx, y2 + 14, Math.max(1, bw), 8, { fill: colorFor(r.g) });
      attachHover(bar, `${y.year} · ${r.g}  ${fmtNum(r.plays)} plays · ${fmtHours(r.ms)}`);
      svg.appendChild(bar);
      svg.appendChild(text(cx + cellW - 4, y2 + 22, fmtNum(r.plays), {
        "text-anchor": "end", "font-size": 10, fill: "#6b7380", class: "num",
      }));
    });
  });

  return svg;
}
