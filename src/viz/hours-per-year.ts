import { mkSvg, rect, text, line, attachHover, C_ACCENT, C_RULE, C_GRID } from "../lib/util";
import { fmtHours, fmtNum, type DataBundle } from "../lib/data";

export function renderHoursPerYear(data: DataBundle): SVGSVGElement {
  const rows = data.hoursPerYear;
  const W = 900;
  const H = 360;
  const marginL = 60;
  const marginR = 24;
  const marginT = 28;
  const marginB = 54;
  const plotW = W - marginL - marginR;
  const plotH = H - marginT - marginB;
  const svg = mkSvg(W, H);

  const max = Math.max(...rows.map((r) => r.ms / 3600_000), 1);
  const niceMax = Math.ceil(max / 100) * 100;
  const barSlot = plotW / rows.length;
  const barW = Math.min(80, barSlot * 0.7);

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

  rows.forEach((r, i) => {
    const h = (r.ms / 3600_000 / niceMax) * plotH;
    const x = marginL + i * barSlot + (barSlot - barW) / 2;
    const y = marginT + plotH - h;
    const bar = rect(x, y, barW, h, { fill: C_ACCENT });
    attachHover(bar, `${r.y}  ${fmtHours(r.ms)}  ${fmtNum(r.plays)} plays · ${fmtNum(r.artists)} artists`);
    svg.appendChild(bar);

    svg.appendChild(text(x + barW / 2, y - 20, fmtHours(r.ms), {
      "text-anchor": "middle", class: "num", "font-size": 11, "font-weight": 600,
    }));
    svg.appendChild(text(x + barW / 2, y - 6, `${fmtNum(r.plays)} plays`, {
      "text-anchor": "middle", class: "num", "font-size": 10, fill: "#6b7380",
    }));
    svg.appendChild(text(x + barW / 2, H - marginB + 14, r.y, {
      "text-anchor": "middle", class: "axis num", "font-weight": 600,
    }));
    svg.appendChild(text(x + barW / 2, H - marginB + 28, `${fmtNum(r.artists)} artists`, {
      "text-anchor": "middle", class: "axis num", fill: "#9aa0a9", "font-size": 9,
    }));
  });

  svg.appendChild(text(marginL, marginT - 10, "HOURS", { class: "axis-label" }));

  return svg;
}
