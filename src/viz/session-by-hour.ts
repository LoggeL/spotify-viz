import { mkSvg, path, text, line, circle, attachHover, C_ACCENT, C_RULE, C_GRID } from "../lib/util";
import { fmtHours, fmtNum, type DataBundle } from "../lib/data";

// Average session duration by hour-of-day it started.
export function renderSessionByHour(data: DataBundle): SVGSVGElement {
  const rows = data.sessions.byHour;
  const W = 900;
  const H = 320;
  const marginL = 56;
  const marginR = 24;
  const marginT = 28;
  const marginB = 40;
  const plotW = W - marginL - marginR;
  const plotH = H - marginT - marginB;
  const svg = mkSvg(W, H);

  const max = Math.max(...rows.map((r) => r.avgMs / 60_000), 1);
  const niceMax = Math.ceil(max / 15) * 15;
  const cellW = plotW / 24;

  for (let i = 0; i <= 5; i++) {
    const v = (niceMax * i) / 5;
    const y = marginT + plotH - (v / niceMax) * plotH;
    svg.appendChild(line(marginL, y, marginL + plotW, y, {
      stroke: i === 0 ? C_RULE : C_GRID, "stroke-width": 1,
      ...(i === 0 ? {} : { "stroke-dasharray": "2 2" }),
    }));
    svg.appendChild(text(marginL - 8, y + 4, `${v}m`, {
      "text-anchor": "end", class: "axis num",
    }));
  }

  let d = "";
  rows.forEach((r, i) => {
    const x = marginL + i * cellW + cellW / 2;
    const y = marginT + plotH - (r.avgMs / 60_000 / niceMax) * plotH;
    d += (i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`);
  });
  svg.appendChild(path(d, { fill: "none", stroke: C_ACCENT, "stroke-width": 2 }));

  rows.forEach((r, i) => {
    const x = marginL + i * cellW + cellW / 2;
    const y = marginT + plotH - (r.avgMs / 60_000 / niceMax) * plotH;
    const c = circle(x, y, 3, { fill: C_ACCENT });
    attachHover(c, `${String(r.h).padStart(2, "0")}:00  avg ${fmtHours(r.avgMs)} · ${r.avgTracks.toFixed(1)} tracks  (${fmtNum(r.count)} sessions)`);
    svg.appendChild(c);

    if (i % 3 === 0) {
      svg.appendChild(text(x, H - marginB + 14, String(r.h).padStart(2, "0"), {
        "text-anchor": "middle", class: "axis num",
      }));
    }
  });

  svg.appendChild(text(marginL, marginT - 10, "AVG SESSION DURATION", { class: "axis-label" }));
  svg.appendChild(text(W - marginR, H - 8, "HOUR OF DAY (UTC)", {
    "text-anchor": "end", class: "axis-label",
  }));

  return svg;
}
