import { mkSvg, path, text, rect, attachHover, C_ACCENT } from "../lib/util";
import { fmtNum, type DataBundle } from "../lib/data";

function arcPath(cx: number, cy: number, rOuter: number, rInner: number, a0: number, a1: number): string {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const x0 = cx + Math.cos(a0) * rOuter, y0 = cy + Math.sin(a0) * rOuter;
  const x1 = cx + Math.cos(a1) * rOuter, y1 = cy + Math.sin(a1) * rOuter;
  const x2 = cx + Math.cos(a1) * rInner, y2 = cy + Math.sin(a1) * rInner;
  const x3 = cx + Math.cos(a0) * rInner, y3 = cy + Math.sin(a0) * rInner;
  return `M ${x0} ${y0} A ${rOuter} ${rOuter} 0 ${large} 1 ${x1} ${y1} L ${x2} ${y2} A ${rInner} ${rInner} 0 ${large} 0 ${x3} ${y3} Z`;
}

export function renderShuffleDonut(data: DataBundle): SVGSVGElement {
  const W = 560;
  const H = 300;
  const svg = mkSvg(W, H);

  const cx = 150;
  const cy = H / 2;
  const R = 100;
  const r = 62;

  const total = data.shuffle.shuffle + data.shuffle.intentional;
  const shuf = data.shuffle.shuffle / total;
  const shufAngle = shuf * Math.PI * 2;
  const start = -Math.PI / 2;

  const p1 = path(arcPath(cx, cy, R, r, start, start + shufAngle), { fill: "#c47a00" });
  attachHover(p1, `Shuffle  ${fmtNum(data.shuffle.shuffle)}  (${(shuf * 100).toFixed(1)}%)`);
  svg.appendChild(p1);

  const p2 = path(arcPath(cx, cy, R, r, start + shufAngle, start + Math.PI * 2), { fill: C_ACCENT });
  attachHover(p2, `Intentional  ${fmtNum(data.shuffle.intentional)}  (${((1 - shuf) * 100).toFixed(1)}%)`);
  svg.appendChild(p2);

  svg.appendChild(text(cx, cy - 2, `${(shuf * 100).toFixed(0)}%`, {
    "text-anchor": "middle", class: "num", "font-size": 30, "font-weight": 600,
  }));
  svg.appendChild(text(cx, cy + 18, "SHUFFLED", {
    "text-anchor": "middle", class: "axis-label",
  }));

  // legend
  const lx = 320;
  svg.appendChild(rect(lx, 90, 12, 12, { fill: "#c47a00" }));
  svg.appendChild(text(lx + 20, 101, `Shuffle`, { "font-size": 13 }));
  svg.appendChild(text(W - 20, 101, fmtNum(data.shuffle.shuffle), {
    "text-anchor": "end", class: "num", "font-size": 13,
  }));

  svg.appendChild(rect(lx, 120, 12, 12, { fill: C_ACCENT }));
  svg.appendChild(text(lx + 20, 131, `Intentional`, { "font-size": 13 }));
  svg.appendChild(text(W - 20, 131, fmtNum(data.shuffle.intentional), {
    "text-anchor": "end", class: "num", "font-size": 13,
  }));

  // separator
  svg.appendChild(rect(lx, 144, W - lx - 20, 1, { fill: "#e6e6e1" }));
  svg.appendChild(text(lx, 162, "TOTAL", { class: "axis-label" }));
  svg.appendChild(text(W - 20, 162, fmtNum(total), {
    "text-anchor": "end", class: "num", "font-size": 13, "font-weight": 600,
  }));

  return svg;
}
