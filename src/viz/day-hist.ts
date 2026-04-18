import { mkSvg, rect, text, line, attachHover, C_INK, C_RULE, C_GRID } from "../lib/util";
import { fmtHours, fmtNum, type DataBundle } from "../lib/data";

// Histogram: how many days had how much listening.
export function renderDayHist(data: DataBundle): SVGSVGElement {
  const rows = data.dayHist;
  const zeroDays = data.zeroDays;
  const W = 900;
  const H = 340;
  const marginL = 60;
  const marginR = 24;
  const marginT = 28;
  const marginB = 60;
  const plotW = W - marginL - marginR;
  const plotH = H - marginT - marginB;
  const svg = mkSvg(W, H);

  // prepend "0" bucket
  const allRows = [{ bucket: "0 (kein play)", n: zeroDays, totalMs: 0 }, ...rows];
  const max = Math.max(...allRows.map((r) => r.n), 1);
  const niceMax = Math.ceil(max / 100) * 100;
  const barSlot = plotW / allRows.length;
  const barW = barSlot * 0.75;

  for (let i = 0; i <= 5; i++) {
    const v = (niceMax * i) / 5;
    const y = marginT + plotH - (v / niceMax) * plotH;
    svg.appendChild(line(marginL, y, marginL + plotW, y, {
      stroke: i === 0 ? C_RULE : C_GRID, "stroke-width": 1,
      ...(i === 0 ? {} : { "stroke-dasharray": "2 2" }),
    }));
    svg.appendChild(text(marginL - 8, y + 4, fmtNum(v), {
      "text-anchor": "end", class: "axis num",
    }));
  }

  allRows.forEach((r, i) => {
    const h = (r.n / niceMax) * plotH;
    const x = marginL + i * barSlot + (barSlot - barW) / 2;
    const y = marginT + plotH - h;
    const bar = rect(x, y, barW, h, { fill: i === 0 ? "#d94f4f" : C_INK });
    attachHover(bar, `${r.bucket}  ${fmtNum(r.n)} Tage${r.totalMs ? ` · ${fmtHours(r.totalMs)}` : ""}`);
    svg.appendChild(bar);
    svg.appendChild(text(x + barW / 2, y - 6, fmtNum(r.n), {
      "text-anchor": "middle", class: "num", "font-size": 10,
    }));
    svg.appendChild(text(x + barW / 2, H - marginB + 14, r.bucket, {
      "text-anchor": "middle", class: "axis num", "font-size": 10,
    }));
    svg.appendChild(text(x + barW / 2, H - marginB + 26, r.totalMs ? fmtHours(r.totalMs) : "", {
      "text-anchor": "middle", class: "axis num", fill: "#9aa0a9", "font-size": 9,
    }));
  });

  svg.appendChild(text(marginL, marginT - 10, "DAYS", { class: "axis-label" }));
  svg.appendChild(text(W - marginR, H - 8, "HOURS LISTENED PER DAY", {
    "text-anchor": "end", class: "axis-label",
  }));

  return svg;
}
