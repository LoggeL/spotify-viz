import { mkSvg, rect, text, line, attachHover, C_INK, C_RULE, C_GRID } from "../lib/util";
import { fmtNum, type DataBundle } from "../lib/data";

// New artists first-heard per month — bar chart.
export function renderDiscovery(data: DataBundle): SVGSVGElement {
  const rows = data.discovery;
  const W = 900;
  const H = 320;
  const marginL = 56;
  const marginR = 24;
  const marginT = 28;
  const marginB = 40;
  const plotW = W - marginL - marginR;
  const plotH = H - marginT - marginB;
  const svg = mkSvg(W, H);

  const max = Math.max(...rows.map((r) => r.n), 1);
  const niceMax = Math.ceil(max / 10) * 10;
  const barSlot = plotW / rows.length;

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

  // year ticks on x
  let lastYear = "";
  rows.forEach((r, i) => {
    const y = r.ym.slice(0, 4);
    if (y !== lastYear) {
      const x = marginL + i * barSlot;
      svg.appendChild(line(x, marginT, x, marginT + plotH, {
        stroke: C_GRID, "stroke-width": 1, "stroke-dasharray": "2 2",
      }));
      svg.appendChild(text(x + 3, H - marginB + 14, y, { class: "axis num" }));
      lastYear = y;
    }
  });

  rows.forEach((r, i) => {
    const h = (r.n / niceMax) * plotH;
    const x = marginL + i * barSlot + 1;
    const y = marginT + plotH - h;
    const bar = rect(x, y, Math.max(1, barSlot - 2), h, { fill: C_INK });
    attachHover(bar, `${r.ym}  ${fmtNum(r.n)} neue artists`);
    svg.appendChild(bar);
  });

  const totalNew = rows.reduce((s, r) => s + r.n, 0);
  svg.appendChild(text(marginL, marginT - 10, "NEW ARTISTS", { class: "axis-label" }));
  svg.appendChild(text(W - marginR, marginT - 10, `${fmtNum(totalNew)} total`, {
    "text-anchor": "end", class: "axis-label",
  }));

  return svg;
}
