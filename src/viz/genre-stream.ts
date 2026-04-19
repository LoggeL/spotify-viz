import { mkSvg, text, path, line, attachHover, PALETTE, C_INK, C_MUTED, C_RULE, C_GRID } from "../lib/util";
import { fmtNum, type DataBundle } from "../lib/data";

// Catmull-Rom → cubic Bezier conversion for a smooth curve through points.
// tension ∈ [0,1]; lower = smoother/looser.
function smoothPath(points: [number, number][], tension = 0.5): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0][0]} ${points[0][1]}`;
  const t = tension;
  const seg: string[] = [`M ${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}`];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const c1x = p1[0] + ((p2[0] - p0[0]) / 6) * t * 2;
    const c1y = p1[1] + ((p2[1] - p0[1]) / 6) * t * 2;
    const c2x = p2[0] - ((p3[0] - p1[0]) / 6) * t * 2;
    const c2y = p2[1] - ((p3[1] - p1[1]) / 6) * t * 2;
    seg.push(`C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`);
  }
  return seg.join(" ");
}

// Build a closed smooth area between a top line and a bottom line (bottom reversed).
function smoothAreaPath(top: [number, number][], bottom: [number, number][]): string {
  const topPath = smoothPath(top, 0.5);
  const revBottom = [...bottom].reverse();
  const bottomPath = smoothPath(revBottom, 0.5);
  // replace the "M" of the bottom with "L" to connect
  return topPath + " " + bottomPath.replace(/^M/, "L") + " Z";
}

const TOP_N = 25;

export function renderGenreStream(data: DataBundle): SVGSVGElement | HTMLElement {
  if (!data.genres) {
    const p = document.createElement("p");
    p.className = "status"; p.textContent = "Keine Genre-Daten.";
    return p;
  }

  // Prefer the full yearlyByGenre series; fall back to byYearStacked keys otherwise.
  const years = data.genres.years ?? data.genres.byYearStacked.map((r) => r.year);
  const yearly = data.genres.yearlyByGenre;
  const useTop = (data.genres.stackedGenres || []).slice(0, TOP_N);

  // Order genres by their peak year (earliest peak first) for visual flow.
  const series = useTop.map((g, i) => {
    const vals = yearly?.[g] ?? data.genres!.byYearStacked.map((r) => Number((r as any)[g] || 0));
    let peakIdx = 0, peakVal = -1;
    vals.forEach((v, k) => { if (v > peakVal) { peakVal = v; peakIdx = k; } });
    return { g, color: PALETTE[i % PALETTE.length], vals, peakIdx, total: vals.reduce((a, b) => a + b, 0) };
  });
  series.sort((a, b) => a.peakIdx - b.peakIdx || b.total - a.total);

  // "other" bundle from remaining plays — use byYearStacked.other if available
  const other = data.genres.byYearStacked.map((r) => Number((r as any).other || 0));

  // All layers incl. other at the bottom (but other is usually the fattest — put it underneath).
  // Visually: put `other` first so it's the base of the stack.
  const layers = [
    { g: "other", color: "#d0cfc8", vals: other, total: other.reduce((a, b) => a + b, 0) },
    ...series,
  ];

  const n = years.length;
  const yearTotals = years.map((_, i) => layers.reduce((s, l) => s + (l.vals[i] || 0), 0));

  // normalized share per year — each column sums to 1.0
  const shares: number[][] = layers.map((l) => l.vals.map((v, i) => (yearTotals[i] > 0 ? v / yearTotals[i] : 0)));
  const maxTotal = 1;

  // Build stacked cumulative arrays (in share space)
  const cum: number[][] = layers.map(() => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    let acc = 0;
    for (let li = 0; li < layers.length; li++) {
      cum[li][i] = acc;
      acc += shares[li][i];
    }
  }

  const W = 900;
  const H = 440;
  const marginL = 56;
  const marginR = 190;
  const marginT = 28;
  const marginB = 36;
  const plotW = W - marginL - marginR;
  const plotH = H - marginT - marginB;
  const svg = mkSvg(W, H);

  const xAt = (i: number) => marginL + (i / Math.max(1, n - 1)) * plotW;
  const yAt = (v: number) => marginT + plotH - (v / maxTotal) * plotH;

  // gridlines (0 – 100 %)
  for (let i = 0; i <= 5; i++) {
    const v = i / 5;
    const y = yAt(v);
    svg.appendChild(line(marginL, y, marginL + plotW, y, {
      stroke: i === 0 ? C_RULE : C_GRID, "stroke-width": 1,
      ...(i === 0 ? {} : { "stroke-dasharray": "2 2" }),
    }));
    svg.appendChild(text(marginL - 8, y + 4, `${(v * 100).toFixed(0)}%`, {
      "text-anchor": "end", class: "axis num",
    }));
  }

  // areas
  layers.forEach((layer, li) => {
    const topPts: [number, number][] = years.map((_, i) => [xAt(i), yAt(cum[li][i] + shares[li][i])]);
    const botPts: [number, number][] = years.map((_, i) => [xAt(i), yAt(cum[li][i])]);
    const d = smoothAreaPath(topPts, botPts);
    const avgShare = shares[li].reduce((a, b) => a + b, 0) / n;
    const p = path(d, {
      fill: layer.color,
      opacity: layer.g === "other" ? 0.35 : 0.82,
      stroke: "#ffffff",
      "stroke-width": 0.6,
    });
    attachHover(p, `${layer.g} · avg share ${(avgShare * 100).toFixed(1)}% · total ${fmtNum(layer.total)} plays`);
    svg.appendChild(p);
  });

  // x-axis year labels
  years.forEach((y, i) => {
    svg.appendChild(text(xAt(i), H - marginB + 16, y, { "text-anchor": "middle", class: "axis num" }));
  });

  // y-axis title
  svg.appendChild(text(marginL, marginT - 10, "SHARE OF YEAR (NORMALIZED)", { class: "axis-label" }));

  // inline labels at right edge for the largest genres of the final year
  const finalY = n - 1;
  const labeled = layers
    .map((l, li) => ({
      g: l.g,
      color: l.color,
      yMid: (yAt(cum[li][finalY]) + yAt(cum[li][finalY] + shares[li][finalY])) / 2,
      v: shares[li][finalY],
    }))
    .filter((x) => x.v > 0)
    .sort((a, b) => a.yMid - b.yMid);

  // collision-avoidance: nudge so labels don't overlap
  const LH = 14;
  for (let i = 1; i < labeled.length; i++) {
    if (labeled[i].yMid - labeled[i - 1].yMid < LH) {
      labeled[i].yMid = labeled[i - 1].yMid + LH;
    }
  }
  labeled.forEach((lab) => {
    const lx = marginL + plotW + 6;
    const gy = lab.yMid;
    svg.appendChild(line(marginL + plotW, gy, lx + 4, gy, { stroke: lab.color, "stroke-width": 1 }));
    svg.appendChild(path(`M ${lx + 4} ${gy - 4} h 8 v 8 h -8 z`, { fill: lab.color }));
    svg.appendChild(text(lx + 16, gy + 3, lab.g.length > 22 ? lab.g.slice(0, 21) + "…" : lab.g, {
      "font-size": 10, "font-weight": 600, fill: C_INK, class: "mono",
    }));
  });

  // caption
  const totalAllPlays = yearTotals.reduce((a, b) => a + b, 0);
  svg.appendChild(text(W - marginR + 4, marginT - 10,
    `${layers.length - 1} genres + other · ${fmtNum(totalAllPlays)} plays total`,
    { "text-anchor": "end", class: "axis-label", fill: C_MUTED }));

  return svg;
}
