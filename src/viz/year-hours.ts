import { mkSvg, rect, text, line, attachHover, seqGreen, C_RULE } from "../lib/util";
import { fmtHours, type DataBundle } from "../lib/data";

// Small-multiples heatmap: per-year row × 24 hour columns (hours listened).
export function renderYearHours(data: DataBundle): SVGSVGElement {
  const rows = data.yearHour;
  const W = 900;
  const marginL = 50;
  const marginR = 100;
  const marginT = 28;
  const marginB = 40;
  const plotW = W - marginL - marginR;
  const rowH = 30;
  const H = marginT + rows.length * rowH + marginB;
  const svg = mkSvg(W, H);

  const cellW = plotW / 24;

  let max = 0;
  for (const r of rows) for (const v of r.hours) if (v > max) max = v;

  rows.forEach((r, ri) => {
    const y = marginT + ri * rowH;
    svg.appendChild(text(marginL - 10, y + rowH / 2 + 4, r.y, {
      "text-anchor": "end", class: "axis num",
    }));
    // year total
    const total = r.hours.reduce((s, v) => s + v, 0);
    svg.appendChild(text(marginL + plotW + 10, y + rowH / 2 + 4, fmtHours(total), {
      class: "num", "font-size": 11, fill: "#6b7380",
    }));

    for (let h = 0; h < 24; h++) {
      const v = r.hours[h];
      const x = marginL + h * cellW;
      const el = rect(x + 1, y + 3, cellW - 2, rowH - 6, {
        fill: v > 0 ? seqGreen(v / max) : "#f4f4f1",
      });
      attachHover(el, `${r.y} · ${String(h).padStart(2, "0")}:00  ${fmtHours(v)}`);
      svg.appendChild(el);
    }
  });

  // x-axis
  for (let h = 0; h < 24; h += 3) {
    svg.appendChild(text(marginL + h * cellW + cellW / 2, H - marginB + 14, String(h).padStart(2, "0"), {
      "text-anchor": "middle", class: "axis num",
    }));
  }

  svg.appendChild(line(marginL, marginT, marginL, H - marginB, { stroke: C_RULE, "stroke-width": 1 }));
  svg.appendChild(line(marginL, H - marginB, marginL + plotW, H - marginB, { stroke: C_RULE, "stroke-width": 1 }));

  svg.appendChild(text(marginL + plotW / 2, H - 8, "HOUR OF DAY (UTC)", {
    "text-anchor": "middle", class: "axis-label",
  }));

  return svg;
}
