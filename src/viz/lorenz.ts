import { mkSvg, path, text, line, circle, C_ACCENT, C_RULE, C_GRID, C_INK } from "../lib/util";
import type { DataBundle } from "../lib/data";

// Lorenz curve: concentration of listening across artists.
// x = bottom-N artists (share of all artists), y = their share of total ms.
// Area between curve and diagonal = inequality.
export function renderLorenz(data: DataBundle): SVGSVGElement {
  const curve = data.lorenz;
  const shares = data.lorenzShares;
  const W = 720;
  const H = 440;
  const marginL = 56;
  const marginR = 220;
  const marginT = 28;
  const marginB = 44;
  const plotW = W - marginL - marginR;
  const plotH = H - marginT - marginB;
  const svg = mkSvg(W, H);

  const xs = (v: number) => marginL + v * plotW;
  const ys = (v: number) => marginT + plotH - v * plotH;

  // grid
  for (let i = 0; i <= 5; i++) {
    const p = i / 5;
    const y = ys(p);
    const x = xs(p);
    svg.appendChild(line(marginL, y, marginL + plotW, y, {
      stroke: i === 0 ? C_RULE : C_GRID, "stroke-width": 1,
      ...(i === 0 ? {} : { "stroke-dasharray": "2 2" }),
    }));
    svg.appendChild(line(x, marginT, x, marginT + plotH, {
      stroke: i === 5 ? C_RULE : C_GRID, "stroke-width": 1,
      ...(i === 5 ? {} : { "stroke-dasharray": "2 2" }),
    }));
    svg.appendChild(text(marginL - 8, y + 4, `${(p * 100).toFixed(0)}%`, {
      "text-anchor": "end", class: "axis num",
    }));
    svg.appendChild(text(x, H - marginB + 14, `${(p * 100).toFixed(0)}%`, {
      "text-anchor": "middle", class: "axis num",
    }));
  }

  // equality diagonal
  svg.appendChild(line(xs(0), ys(0), xs(1), ys(1), {
    stroke: "#9aa0a9", "stroke-width": 1, "stroke-dasharray": "4 3",
  }));

  // curve path
  let d = "";
  curve.forEach((p, i) => {
    d += (i === 0 ? `M ${xs(p.x)} ${ys(p.y)}` : ` L ${xs(p.x)} ${ys(p.y)}`);
  });
  // filled area (between curve and diagonal)
  const fillPath = `${d} L ${xs(1)} ${ys(0)} L ${xs(0)} ${ys(0)} Z`;
  svg.appendChild(path(fillPath, { fill: "rgba(29, 185, 84, 0.10)" }));
  svg.appendChild(path(d, { fill: "none", stroke: C_ACCENT, "stroke-width": 2 }));

  svg.appendChild(text(marginL, marginT - 10, "SHARE OF HOURS", { class: "axis-label" }));
  svg.appendChild(text(marginL + plotW / 2, H - 8, "SHARE OF ARTISTS (bottom-ranked first)", {
    "text-anchor": "middle", class: "axis-label",
  }));

  // side callouts: top X% → Y% of listening
  const rx = marginL + plotW + 20;
  svg.appendChild(text(rx, marginT + 14, "CONCENTRATION", { class: "axis-label" }));
  shares.forEach((s, i) => {
    const y = marginT + 36 + i * 42;
    svg.appendChild(text(rx, y, `TOP ${(s.topPct * 100).toFixed(0)}% ARTISTS`, {
      "font-size": 10, fill: "#6b7380", "font-weight": 600, "letter-spacing": "0.05em",
    }));
    svg.appendChild(text(rx, y + 18, `${(s.shareOfMs * 100).toFixed(1)}%`, {
      class: "num", "font-size": 20, "font-weight": 700, fill: C_INK,
    }));
    svg.appendChild(text(rx + 66, y + 18, "der stunden", {
      "font-size": 10, fill: "#6b7380",
    }));
    // emphasize top entry
    if (i === 0) {
      const xx = xs(1 - s.topPct);
      const yy = ys(1 - s.shareOfMs);
      svg.appendChild(circle(xx, yy, 4, { fill: C_ACCENT }));
      svg.appendChild(line(xx, yy, xx, ys(0), {
        stroke: C_ACCENT, "stroke-width": 0.8, "stroke-dasharray": "2 2",
      }));
    }
  });

  return svg;
}
