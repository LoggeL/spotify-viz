import { mkSvg, path, text, circle, attachHover, seqGreen } from "../lib/util";
import { fmtHours, type DataBundle } from "../lib/data";

function wedgePath(cx: number, cy: number, rOuter: number, rInner: number, a0: number, a1: number): string {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const x0 = cx + Math.cos(a0) * rOuter, y0 = cy + Math.sin(a0) * rOuter;
  const x1 = cx + Math.cos(a1) * rOuter, y1 = cy + Math.sin(a1) * rOuter;
  const x2 = cx + Math.cos(a1) * rInner, y2 = cy + Math.sin(a1) * rInner;
  const x3 = cx + Math.cos(a0) * rInner, y3 = cy + Math.sin(a0) * rInner;
  return `M ${x0} ${y0} A ${rOuter} ${rOuter} 0 ${large} 1 ${x1} ${y1} L ${x2} ${y2} A ${rInner} ${rInner} 0 ${large} 0 ${x3} ${y3} Z`;
}

export function renderClockSpiral(data: DataBundle): SVGSVGElement {
  const W = 520;
  const H = 520;
  const svg = mkSvg(W, H);
  const cx = W / 2;
  const cy = H / 2;
  const rMin = 70;
  const rMax = 200;

  const hourTotals = Array(24).fill(0);
  for (let d = 0; d < 7; d++) for (let h = 0; h < 24; h++) hourTotals[h] += data.clock[d][h];
  const max = Math.max(...hourTotals, 1);

  // reference rings
  for (let i = 1; i <= 4; i++) {
    const r = rMin + (rMax - rMin) * (i / 4);
    svg.appendChild(circle(cx, cy, r, { fill: "none", stroke: "#ededea", "stroke-width": 1 }));
  }
  svg.appendChild(circle(cx, cy, rMin, { fill: "none", stroke: "#d8d8d3", "stroke-width": 1 }));

  for (let h = 0; h < 24; h++) {
    const a0 = (h / 24) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((h + 1) / 24) * Math.PI * 2 - Math.PI / 2;
    const value = hourTotals[h];
    const r = rMin + (value / max) * (rMax - rMin);

    const wedge = path(wedgePath(cx, cy, r, rMin, a0, a1), {
      fill: seqGreen(0.25 + (value / max) * 0.7),
    });
    attachHover(wedge, `${String(h).padStart(2, "0")}:00  ${fmtHours(value)}`);
    svg.appendChild(wedge);
  }

  // hour labels (every 3h)
  for (let h = 0; h < 24; h += 3) {
    const a = (h / 24) * Math.PI * 2 - Math.PI / 2;
    const lx = cx + Math.cos(a) * (rMax + 16);
    const ly = cy + Math.sin(a) * (rMax + 16);
    svg.appendChild(text(lx, ly + 4, String(h).padStart(2, "0"), {
      "text-anchor": "middle", class: "axis num",
    }));
  }

  svg.appendChild(text(cx, cy - 4, "24h", {
    "text-anchor": "middle", class: "num", "font-size": 22, "font-weight": 600,
  }));
  svg.appendChild(text(cx, cy + 14, "CLOCK", {
    "text-anchor": "middle", class: "axis-label",
  }));

  return svg;
}
