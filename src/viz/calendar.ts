import { mkSvg, rect, text, attachHover, seqGreen } from "../lib/util";
import { fmtHours, type DataBundle } from "../lib/data";

export function renderCalendar(data: DataBundle): SVGSVGElement {
  const byYear = new Map<string, Map<string, number>>();
  for (const rec of data.day) {
    const y = rec.d.slice(0, 4);
    if (!byYear.has(y)) byYear.set(y, new Map());
    byYear.get(y)!.set(rec.d, rec.ms);
  }
  const years = [...byYear.keys()].sort();

  const W = 980;
  const yearH = 110;
  const H = years.length * yearH + 10;
  const svg = mkSvg(W, H);

  // percentile thresholds
  const allMs = data.day.map((x) => x.ms).filter((v) => v > 0).sort((a, b) => a - b);
  const pct = (p: number) => allMs[Math.floor(allMs.length * p)] || 0;
  const max = allMs[allMs.length - 1] || 1;
  const thresholds = [pct(0.2), pct(0.4), pct(0.6), pct(0.8)];
  void thresholds;
  void max;

  const cellW = 15;
  const cellH = 13;
  const left = 70;

  years.forEach((y, yi) => {
    const yStart = yi * yearH + 20;
    svg.appendChild(text(24, yStart + 32, y, { "font-size": 14, "font-weight": 600, class: "num" }));

    // day-of-week labels
    const dows = ["M", "W", "F"];
    [0, 2, 4].forEach((d, idx) => {
      svg.appendChild(text(52, yStart + d * cellH + 10, dows[idx], {
        class: "axis", "font-size": 9,
      }));
    });

    const m = byYear.get(y)!;
    const start = new Date(`${y}-01-01T00:00:00Z`);
    const end = new Date(`${y}-12-31T00:00:00Z`);
    const days = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;

    for (let i = 0; i < days; i++) {
      const d = new Date(start.getTime() + i * 86400000);
      const iso = d.toISOString().slice(0, 10);
      const ms = m.get(iso) || 0;
      const dow = (d.getUTCDay() + 6) % 7;
      const week = Math.floor((i + ((start.getUTCDay() + 6) % 7)) / 7);
      const x = left + week * cellW;
      const yy = yStart + dow * cellH;

      const fill = ms > 0 ? seqGreen(Math.min(1, ms / 14400000)) : "#f4f4f1";
      const el = rect(x, yy, cellW - 2, cellH - 2, { fill, rx: 1 });
      if (ms > 0) attachHover(el, `${iso}  ${fmtHours(ms)}`);
      svg.appendChild(el);
    }

    // month labels
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (let mi = 0; mi < 12; mi++) {
      const d = new Date(Date.UTC(Number(y), mi, 1));
      const dayOfYear = Math.floor((d.getTime() - start.getTime()) / 86400000);
      const week = Math.floor((dayOfYear + ((start.getUTCDay() + 6) % 7)) / 7);
      svg.appendChild(text(left + week * cellW, yStart - 4, months[mi].toUpperCase(), {
        class: "axis-label", "font-size": 9,
      }));
    }
  });

  return svg;
}
