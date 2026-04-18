import { mkSvg, rect, text, line, attachHover, seqGreen, C_RULE } from "../lib/util";
import { fmtHours, type DataBundle } from "../lib/data";

export function renderYearMonth(data: DataBundle): SVGSVGElement {
  const W = 900;
  const marginL = 52;
  const marginT = 24;
  const marginB = 32;
  const marginR = 20;
  const months = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

  const years = [...new Set(data.yearMonth.map((x) => x.ym.slice(0, 4)))].sort();
  const cellW = (W - marginL - marginR) / 12;
  const cellH = 28;
  const H = marginT + years.length * cellH + marginB;

  const svg = mkSvg(W, H);

  const max = Math.max(...data.yearMonth.map((x) => x.ms), 1);

  for (let m = 0; m < 12; m++) {
    svg.appendChild(text(marginL + m * cellW + cellW / 2, marginT - 8, months[m].toUpperCase(), {
      "text-anchor": "middle", class: "axis-label",
    }));
  }

  for (let yi = 0; yi < years.length; yi++) {
    const y = years[yi];
    svg.appendChild(text(marginL - 10, marginT + yi * cellH + cellH / 2 + 4, y, {
      "text-anchor": "end", class: "axis num",
    }));
    for (let m = 0; m < 12; m++) {
      const key = `${y}-${String(m + 1).padStart(2, "0")}`;
      const rec = data.yearMonth.find((x) => x.ym === key);
      const ms = rec?.ms ?? 0;
      const x = marginL + m * cellW;
      const yy = marginT + yi * cellH;
      const el = rect(x + 1, yy + 1, cellW - 2, cellH - 2, {
        fill: ms > 0 ? seqGreen(ms / max) : "#f4f4f1",
      });
      attachHover(el, `${key}  ${fmtHours(ms)}`);
      svg.appendChild(el);

      const h = ms / max;
      if (h > 0.55) {
        const hrs = (ms / 3600_000).toFixed(0);
        svg.appendChild(text(x + cellW / 2, yy + cellH / 2 + 4, `${hrs}h`, {
          "text-anchor": "middle", class: "num",
          fill: "#fff", "font-size": 10, "font-weight": 600,
        }));
      }
    }
  }

  svg.appendChild(line(marginL, marginT, marginL + 12 * cellW, marginT, { stroke: C_RULE, "stroke-width": 1 }));
  svg.appendChild(line(marginL, marginT + years.length * cellH, marginL + 12 * cellW, marginT + years.length * cellH, { stroke: C_RULE, "stroke-width": 1 }));

  return svg;
}
