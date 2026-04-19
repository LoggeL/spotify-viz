import { mkSvg, rect, text, line, attachHover, PALETTE, C_RULE, C_GRID } from "../lib/util";
import { fmtNum, type DataBundle } from "../lib/data";

// Stacked bars per year showing top genres + "other"
export function renderGenreEvolution(data: DataBundle): SVGSVGElement | HTMLElement {
  if (!data.genres) {
    const p = document.createElement("p");
    p.className = "status"; p.textContent = "Keine Genre-Daten.";
    return p;
  }
  const rows = data.genres.byYearStacked;
  const stackedGenres = data.genres.stackedGenres;
  const keys = [...stackedGenres, "other"];
  const W = 900;
  const H = 400;
  const marginL = 52;
  const marginR = 220;
  const marginT = 28;
  const marginB = 44;
  const plotW = W - marginL - marginR;
  const plotH = H - marginT - marginB;
  const svg = mkSvg(W, H);

  const barGap = 10;
  const barW = (plotW / rows.length) - barGap;
  let max = 0;
  for (const r of rows) {
    let sum = 0;
    for (const k of keys) sum += Number(r[k] || 0);
    if (sum > max) max = sum;
  }
  const niceMax = Math.ceil(max / 5000) * 5000;
  const yScale = (v: number) => (v / niceMax) * plotH;

  for (let i = 0; i <= 5; i++) {
    const v = (niceMax * i) / 5;
    const y = marginT + plotH - yScale(v);
    svg.appendChild(line(marginL, y, marginL + plotW, y, {
      stroke: i === 0 ? C_RULE : C_GRID, "stroke-width": 1,
      ...(i === 0 ? {} : { "stroke-dasharray": "2 2" }),
    }));
    svg.appendChild(text(marginL - 8, y + 4, fmtNum(v), { "text-anchor": "end", class: "axis num" }));
  }

  const colorFor = (i: number) => i < stackedGenres.length ? PALETTE[i % PALETTE.length] : "#d0cfc8";

  rows.forEach((r, i) => {
    const x = marginL + i * (barW + barGap) + barGap / 2;
    let yOff = marginT + plotH;
    keys.forEach((g, gi) => {
      const v = Number(r[g] || 0);
      if (!v) return;
      const h = yScale(v);
      yOff -= h;
      const seg = rect(x, yOff, barW, h, { fill: colorFor(gi) });
      attachHover(seg, `${r.year} · ${g}  ${fmtNum(v)} plays`);
      svg.appendChild(seg);
    });
    svg.appendChild(text(x + barW / 2, H - marginB + 14, String(r.year), {
      "text-anchor": "middle", class: "axis num",
    }));
  });

  const lx = marginL + plotW + 18;
  keys.forEach((g, gi) => {
    const ly = marginT + gi * 18;
    svg.appendChild(rect(lx, ly, 10, 10, { fill: colorFor(gi) }));
    const label = g.length > 22 ? g.slice(0, 21) + "…" : g;
    svg.appendChild(text(lx + 16, ly + 9, label, { "font-size": 11 }));
  });

  svg.appendChild(text(marginL, marginT - 8, "PLAYS (TOP-10 GENRES + OTHER)", { class: "axis-label" }));
  return svg;
}
