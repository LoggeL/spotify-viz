import { mkSvg, rect, text, line, attachHover, C_ACCENT, C_RULE, C_GRID } from "../lib/util";
import { fmtHours, fmtNum, type DataBundle } from "../lib/data";

const DAYS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
const DAYS_SHORT = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export function renderWeekday(data: DataBundle): SVGSVGElement {
  const rows = data.weekday;
  const W = 720;
  const H = 340;
  const marginL = 60;
  const marginR = 140;
  const marginT = 28;
  const marginB = 40;
  const plotW = W - marginL - marginR;
  const plotH = H - marginT - marginB;
  const svg = mkSvg(W, H);

  const max = Math.max(...rows.map((r) => r.ms / 3600_000), 1);
  const niceMax = Math.ceil(max / 100) * 100;
  const barSlot = plotW / rows.length;
  const barW = barSlot * 0.75;

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
    const bar = rect(x, y, barW, h, { fill: i >= 5 ? "#c47a00" : C_ACCENT });
    attachHover(bar, `${DAYS[i]}  ${fmtHours(r.ms)}  ${fmtNum(r.plays)} plays`);
    svg.appendChild(bar);

    svg.appendChild(text(x + barW / 2, y - 6, fmtHours(r.ms), {
      "text-anchor": "middle", class: "num", "font-size": 11,
    }));
    svg.appendChild(text(x + barW / 2, H - marginB + 14, DAYS_SHORT[i], {
      "text-anchor": "middle", class: "axis num", "font-weight": 600,
    }));
  });

  // right: week breakdown
  const totalMs = rows.reduce((s, r) => s + r.ms, 0);
  const weekdayMs = rows.slice(0, 5).reduce((s, r) => s + r.ms, 0);
  const weekendMs = rows.slice(5).reduce((s, r) => s + r.ms, 0);

  const rx = marginL + plotW + 20;
  svg.appendChild(text(rx, marginT + 12, "Mo–Fr", { class: "axis-label" }));
  svg.appendChild(text(rx, marginT + 32, fmtHours(weekdayMs), {
    class: "num", "font-size": 16, "font-weight": 600,
  }));
  svg.appendChild(text(rx, marginT + 50, `${((weekdayMs / totalMs) * 100).toFixed(1)}%`, {
    class: "num", "font-size": 12, fill: "#6b7380",
  }));
  svg.appendChild(text(rx, marginT + 82, "Sa–So", { class: "axis-label" }));
  svg.appendChild(text(rx, marginT + 102, fmtHours(weekendMs), {
    class: "num", "font-size": 16, "font-weight": 600, fill: "#c47a00",
  }));
  svg.appendChild(text(rx, marginT + 120, `${((weekendMs / totalMs) * 100).toFixed(1)}%`, {
    class: "num", "font-size": 12, fill: "#6b7380",
  }));

  svg.appendChild(text(marginL, marginT - 10, "HOURS", { class: "axis-label" }));

  return svg;
}
