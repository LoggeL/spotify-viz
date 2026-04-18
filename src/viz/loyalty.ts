import { mkSvg, rect, text, line, attachHover, C_ACCENT, C_GRID } from "../lib/util";
import type { DataBundle } from "../lib/data";

export function renderLoyalty(data: DataBundle): SVGSVGElement {
  const months = data.loyalty.months;
  const rows = data.loyalty.rows;
  const W = 980;
  const rowH = 20;
  const marginL = 180;
  const marginT = 40;
  const marginR = 20;
  const H = marginT + rows.length * rowH + 20;
  const svg = mkSvg(W, H);

  const cellW = (W - marginL - marginR) / months.length;

  // year ticks
  let lastYear = "";
  months.forEach((m, i) => {
    const y = m.slice(0, 4);
    if (y !== lastYear) {
      const x = marginL + i * cellW;
      svg.appendChild(line(x, marginT - 16, x, H - 10, { stroke: C_GRID, "stroke-width": 1 }));
      svg.appendChild(text(x + 4, marginT - 6, y, { class: "axis num" }));
      lastYear = y;
    }
  });

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const y = marginT + i * rowH;
    svg.appendChild(text(marginL - 10, y + 14, r.a.length > 24 ? r.a.slice(0, 23) + "…" : r.a, {
      "text-anchor": "end", "font-size": 12,
    }));

    // baseline
    svg.appendChild(line(marginL, y + rowH / 2, W - marginR, y + rowH / 2, {
      stroke: "#f4f4f1", "stroke-width": 1,
    }));

    r.active.forEach((v, j) => {
      if (!v) return;
      const x = marginL + j * cellW;
      const el = rect(x, y + 4, Math.max(2, cellW - 1), rowH - 8, { fill: C_ACCENT });
      attachHover(el, `${r.a}  ${months[j]}`);
      svg.appendChild(el);
    });
  }

  return svg;
}
