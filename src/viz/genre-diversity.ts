import { mkSvg, path, text, line, circle, attachHover, C_ACCENT, C_RULE, C_GRID } from "../lib/util";
import type { DataBundle } from "../lib/data";

// Line chart: unique genres heard per year
export function renderGenreDiversity(data: DataBundle): SVGSVGElement | HTMLElement {
  if (!data.genres) {
    const p = document.createElement("p");
    p.className = "status"; p.textContent = "Keine Genre-Daten.";
    return p;
  }
  const rows = data.genres.diversity;
  const W = 900;
  const H = 280;
  const marginL = 52;
  const marginR = 24;
  const marginT = 28;
  const marginB = 40;
  const plotW = W - marginL - marginR;
  const plotH = H - marginT - marginB;
  const svg = mkSvg(W, H);

  const max = Math.max(...rows.map((r) => r.n), 1);
  const niceMax = Math.ceil(max / 20) * 20;
  const cellW = plotW / (rows.length - 1 || 1);

  for (let i = 0; i <= 5; i++) {
    const v = (niceMax * i) / 5;
    const y = marginT + plotH - (v / niceMax) * plotH;
    svg.appendChild(line(marginL, y, marginL + plotW, y, {
      stroke: i === 0 ? C_RULE : C_GRID, "stroke-width": 1,
      ...(i === 0 ? {} : { "stroke-dasharray": "2 2" }),
    }));
    svg.appendChild(text(marginL - 8, y + 4, String(v), {
      "text-anchor": "end", class: "axis num",
    }));
  }

  let d = "";
  rows.forEach((r, i) => {
    const x = marginL + i * cellW;
    const y = marginT + plotH - (r.n / niceMax) * plotH;
    d += (i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`);
  });
  svg.appendChild(path(d, { fill: "none", stroke: C_ACCENT, "stroke-width": 2 }));

  rows.forEach((r, i) => {
    const x = marginL + i * cellW;
    const y = marginT + plotH - (r.n / niceMax) * plotH;
    const c = circle(x, y, 4, { fill: C_ACCENT });
    attachHover(c, `${r.year}  ${r.n} unique genres`);
    svg.appendChild(c);
    svg.appendChild(text(x, y - 10, String(r.n), {
      "text-anchor": "middle", class: "num", "font-size": 11, "font-weight": 600,
    }));
    svg.appendChild(text(x, H - marginB + 14, r.year, {
      "text-anchor": "middle", class: "axis num",
    }));
  });

  svg.appendChild(text(marginL, marginT - 10, "UNIQUE GENRES / YEAR", { class: "axis-label" }));
  return svg;
}
