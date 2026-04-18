import { mkSvg, rect, text, line, attachHover, seqGreen, C_RULE } from "../lib/util";
import { fmtHours, type DataBundle } from "../lib/data";

export function renderClock(data: DataBundle): SVGSVGElement {
  const days = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  const W = 900;
  const H = 300;
  const marginL = 36;
  const marginT = 24;
  const marginB = 40;
  const marginR = 100;
  const plotW = W - marginL - marginR;
  const plotH = H - marginT - marginB;
  const cellW = plotW / 24;
  const cellH = plotH / 7;

  const svg = mkSvg(W, H);

  let max = 0;
  for (const row of data.clock) for (const v of row) if (v > max) max = v;

  // cells
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      const v = data.clock[d][h];
      const x = marginL + h * cellW;
      const y = marginT + d * cellH;
      const r = rect(x, y, cellW - 1, cellH - 1, {
        fill: v > 0 ? seqGreen(v / max) : "#f4f4f1",
      });
      attachHover(r, `${days[d]} ${String(h).padStart(2, "0")}:00  ${fmtHours(v)}`);
      svg.appendChild(r);
    }
  }

  // y-axis (days)
  for (let d = 0; d < 7; d++) {
    svg.appendChild(text(marginL - 8, marginT + d * cellH + cellH / 2 + 4, days[d], {
      "text-anchor": "end", class: "axis",
    }));
  }

  // x-axis (hours)
  for (let h = 0; h < 24; h += 3) {
    svg.appendChild(text(marginL + h * cellW + cellW / 2, H - marginB + 14, String(h).padStart(2, "0"), {
      "text-anchor": "middle", class: "axis num",
    }));
  }
  svg.appendChild(text(marginL + plotW / 2, H - 8, "HOUR OF DAY (UTC)", {
    "text-anchor": "middle", class: "axis-label",
  }));

  // legend strip
  const lx = W - marginR + 16;
  const ly = marginT + 10;
  const lh = plotH - 20;
  const steps = 40;
  for (let i = 0; i < steps; i++) {
    svg.appendChild(rect(lx, ly + lh - (i + 1) * (lh / steps), 10, lh / steps + 0.5, {
      fill: seqGreen(i / (steps - 1)),
    }));
  }
  svg.appendChild(rect(lx, ly, 10, lh, { fill: "none", stroke: C_RULE, "stroke-width": 1 }));
  svg.appendChild(text(lx + 14, ly + 8, fmtHours(max), { class: "axis num" }));
  svg.appendChild(text(lx + 14, ly + lh, "0", { class: "axis num" }));
  svg.appendChild(text(lx + 14, ly - 6, "INTENSITY", { class: "axis-label" }));

  // frame
  svg.appendChild(line(marginL, marginT, marginL, marginT + plotH, { class: "rule" }));
  svg.appendChild(line(marginL, marginT + plotH, marginL + plotW, marginT + plotH, { class: "rule" }));

  return svg;
}
