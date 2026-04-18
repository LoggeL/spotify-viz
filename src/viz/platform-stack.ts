import { mkSvg, rect, text, line, attachHover, PALETTE, C_RULE, C_GRID } from "../lib/util";
import { fmtHours, fmtNum, type DataBundle } from "../lib/data";

export function renderPlatformStack(data: DataBundle): SVGSVGElement {
  const W = 900;
  const H = 380;
  const marginL = 52;
  const marginR = 160;
  const marginT = 28;
  const marginB = 44;
  const plotW = W - marginL - marginR;
  const plotH = H - marginT - marginB;
  const svg = mkSvg(W, H);

  const rows = data.platformStack;
  const platforms = data.platforms;
  const barGap = 8;
  const barW = (plotW / rows.length) - barGap;

  let max = 0;
  for (const r of rows) {
    let sum = 0;
    for (const pf of platforms) sum += (r[pf] as number) || 0;
    if (sum > max) max = sum;
  }
  const niceMax = Math.ceil(max / 10000) * 10000;
  const yScale = (v: number) => (v / niceMax) * plotH;

  for (let i = 0; i <= 5; i++) {
    const v = (niceMax * i) / 5;
    const y = marginT + plotH - yScale(v);
    svg.appendChild(line(marginL, y, marginL + plotW, y, {
      stroke: i === 0 ? C_RULE : C_GRID, "stroke-width": 1,
      ...(i === 0 ? {} : { "stroke-dasharray": "2 2" }),
    }));
    svg.appendChild(text(marginL - 8, y + 4, fmtNum(v), {
      "text-anchor": "end", class: "axis num",
    }));
  }

  rows.forEach((r, i) => {
    const x = marginL + i * (barW + barGap) + barGap / 2;
    let yOff = marginT + plotH;
    let totalMs = 0;
    let totalPlays = 0;
    const msRow = r._ms as Record<string, number>;
    platforms.forEach((pf, pi) => {
      const v = (r[pf] as number) || 0;
      if (!v) return;
      totalPlays += v;
      totalMs += msRow[pf] || 0;
      const h = yScale(v);
      yOff -= h;
      const seg = rect(x, yOff, barW, h, { fill: PALETTE[pi % PALETTE.length] });
      attachHover(seg, `${r.year} · ${pf}  ${fmtNum(v)} plays  ${fmtHours(msRow[pf] || 0)}`);
      svg.appendChild(seg);
    });
    svg.appendChild(text(x + barW / 2, H - marginB + 14, r.year, {
      "text-anchor": "middle", class: "axis num",
    }));
    svg.appendChild(text(x + barW / 2, H - marginB + 26, fmtHours(totalMs), {
      "text-anchor": "middle", class: "axis num", fill: "#9aa0a9", "font-size": 9,
    }));
    void totalPlays;
  });

  const lx = marginL + plotW + 18;
  platforms.forEach((pf, pi) => {
    const ly = marginT + pi * 20;
    svg.appendChild(rect(lx, ly, 10, 10, { fill: PALETTE[pi % PALETTE.length] }));
    svg.appendChild(text(lx + 16, ly + 9, pf, { "font-size": 11 }));
  });

  svg.appendChild(text(marginL, marginT - 8, "PLAYS", { class: "axis-label" }));

  return svg;
}
