import { mkSvg, circle, text, line, attachHover, C_INK, C_MUTED, C_GRID } from "../lib/util";
import { fmtHours, fmtNum, type DataBundle } from "../lib/data";

export function renderFirstPlays(data: DataBundle): SVGSVGElement {
  const rows = data.firstPlays;
  const W = 980;
  const rowH = 22;
  const marginT = 50;
  const marginL = 60;
  const marginR = 20;
  const H = marginT + rows.length * rowH + 20;
  const svg = mkSvg(W, H);

  const start = new Date(data.totals.firstPlay).getTime();
  const end = new Date(data.totals.lastPlay).getTime();
  const span = end - start;
  const scale = (t: number) => marginL + ((t - start) / span) * (W - marginL - marginR);

  for (const y of data.totals.years) {
    const t = new Date(`${y}-01-01T00:00:00Z`).getTime();
    if (t < start || t > end) continue;
    const x = scale(t);
    svg.appendChild(line(x, 32, x, H - 10, {
      stroke: C_GRID, "stroke-width": 1, "stroke-dasharray": "2 2",
    }));
    svg.appendChild(text(x, 24, y, { "text-anchor": "middle", class: "axis num" }));
  }
  svg.appendChild(line(marginL, 32, W - marginR, 32, { stroke: C_INK, "stroke-width": 1 }));

  rows.forEach((r, i) => {
    const t = new Date(r.first).getTime();
    const x = scale(t);
    const y = marginT + i * rowH;
    svg.appendChild(line(x, 32, x, y, {
      stroke: C_MUTED, "stroke-width": 0.5, "stroke-dasharray": "1 2",
    }));
    const dot = circle(x, y, 4, { fill: C_INK });
    attachHover(dot, `${r.a}  first ${r.first.slice(0, 10)}  ${fmtNum(r.plays)} plays  ${fmtHours(r.ms)}`);
    svg.appendChild(dot);
    svg.appendChild(text(x + 8, y + 4, `${r.a} · ${fmtNum(r.plays)} plays · ${fmtHours(r.ms)}`, { "font-size": 12 }));
  });

  return svg;
}
