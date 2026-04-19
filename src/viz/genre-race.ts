import { mkSvg, text, path, rect, line, circle, attachHover, PALETTE, C_INK, C_MUTED, C_RULE } from "../lib/util";
import { fmtNum, type DataBundle } from "../lib/data";

// Small-multiples sparklines: share (%) of each top-12 genre per year.
// One row per genre with a mini area+line chart.
const TOP_N = 12;

export function renderGenreRace(data: DataBundle): SVGSVGElement | HTMLElement {
  if (!data.genres) {
    const p = document.createElement("p");
    p.className = "status"; p.textContent = "Keine Genre-Daten.";
    return p;
  }
  const rows = data.genres.byYearStacked;
  if (!rows || rows.length === 0) {
    const p = document.createElement("p");
    p.className = "status"; p.textContent = "Keine Zeitdaten.";
    return p;
  }
  // available genre keys = stackedGenres + "other"
  const genres = [...data.genres.stackedGenres];
  // limit to TOP_N (stackedGenres already ordered by total plays)
  const useGenres = genres.slice(0, TOP_N);

  // compute year totals for share normalization
  const yearTotal = rows.map((r) => {
    let s = 0;
    for (const k of Object.keys(r)) {
      if (k === "year") continue;
      s += Number((r as any)[k] || 0);
    }
    return s;
  });

  type Series = { g: string; color: string; total: number; shares: number[]; plays: number[]; peak: number; trough: number };
  const series: Series[] = useGenres.map((g, i) => {
    const plays = rows.map((r) => Number((r as any)[g] || 0));
    const shares = plays.map((v, k) => yearTotal[k] ? v / yearTotal[k] : 0);
    const peak = Math.max(...shares);
    const trough = Math.min(...shares);
    const total = plays.reduce((a, b) => a + b, 0);
    return { g, color: PALETTE[i % PALETTE.length], total, shares, plays, peak, trough };
  }).sort((a, b) => b.total - a.total);

  const globalMax = Math.max(...series.map((s) => s.peak), 0.01);

  const W = 900;
  const rowH = 44;
  const marginT = 44;
  const marginB = 24;
  const H = marginT + series.length * rowH + marginB;
  const svg = mkSvg(W, H);

  // layout: genre label | sparkline | peak % | latest %
  const labelW = 180;
  const spkX = labelW + 14;
  const yearCountX = W - 210;
  const peakX = W - 140;
  const latestX = W - 60;
  const spkW = yearCountX - spkX - 18;

  // header
  svg.appendChild(text(14, 22, "GENRE", { class: "axis-label" }));
  svg.appendChild(text(spkX, 22, `SHARE OF YEAR · ${rows[0].year}–${rows[rows.length - 1].year}`, { class: "axis-label" }));
  svg.appendChild(text(yearCountX, 22, "YEARS ACTIVE", { "text-anchor": "end", class: "axis-label" }));
  svg.appendChild(text(peakX, 22, "PEAK", { "text-anchor": "end", class: "axis-label" }));
  svg.appendChild(text(latestX + 20, 22, "NOW", { "text-anchor": "end", class: "axis-label" }));
  svg.appendChild(line(0, 30, W, 30, { stroke: C_RULE, "stroke-width": 1 }));

  // year tick labels above first sparkline
  const n = rows.length;
  const xAt = (i: number) => spkX + (i / (n - 1)) * spkW;
  // put faint year labels underneath last row below
  const lastY = marginT + (series.length - 1) * rowH + rowH - 4;
  for (let i = 0; i < n; i++) {
    const x = xAt(i);
    if (i === 0 || i === n - 1 || i === Math.floor(n / 2)) {
      svg.appendChild(text(x, lastY + 12, rows[i].year, { "text-anchor": "middle", class: "axis num", "font-size": 9, fill: C_MUTED }));
    }
  }

  series.forEach((s, idx) => {
    const y = marginT + idx * rowH;
    const yBase = y + rowH - 10;
    const yTop = y + 6;
    const plotH = yBase - yTop;
    const scaleY = (v: number) => yBase - (v / globalMax) * plotH;

    // label
    svg.appendChild(rect(0, y, 4, rowH - 4, { fill: s.color }));
    const short = s.g.length > 22 ? s.g.slice(0, 21) + "…" : s.g;
    svg.appendChild(text(10, y + 18, short, { "font-size": 12, "font-weight": 600, fill: C_INK }));
    svg.appendChild(text(10, y + 31, `${fmtNum(s.total)} plays`, { "font-size": 10, fill: C_MUTED, class: "num" }));

    // axis base
    svg.appendChild(line(spkX, yBase, spkX + spkW, yBase, { stroke: C_RULE, "stroke-width": 0.6 }));

    // area path
    let area = `M ${spkX} ${yBase}`;
    s.shares.forEach((v, i) => { area += ` L ${xAt(i)} ${scaleY(v)}`; });
    area += ` L ${spkX + spkW} ${yBase} Z`;
    svg.appendChild(path(area, { fill: s.color, opacity: 0.18 }));

    // line path
    let ln = "";
    s.shares.forEach((v, i) => { ln += (i === 0 ? "M " : " L ") + `${xAt(i)} ${scaleY(v)}`; });
    svg.appendChild(path(ln, { fill: "none", stroke: s.color, "stroke-width": 1.8 }));

    // hover dots
    s.shares.forEach((v, i) => {
      const cx = xAt(i);
      const cy = scaleY(v);
      const dot = circle(cx, cy, 2.6, { fill: "#fff", stroke: s.color, "stroke-width": 1.4 });
      attachHover(dot, `${s.g} · ${rows[i].year}: ${(v * 100).toFixed(1)}% · ${fmtNum(s.plays[i])} plays`);
      svg.appendChild(dot);
    });

    // years active (>=1 play)
    const yearsActive = s.plays.filter((p) => p > 0).length;
    svg.appendChild(text(yearCountX, y + 26, `${yearsActive}/${n}`, {
      "text-anchor": "end", class: "num", "font-size": 12, fill: C_INK,
    }));

    // peak pct
    svg.appendChild(text(peakX, y + 26, `${(s.peak * 100).toFixed(1)}%`, {
      "text-anchor": "end", class: "num", "font-size": 12, "font-weight": 600, fill: s.color,
    }));

    // latest pct — with trend arrow
    const latest = s.shares[s.shares.length - 1];
    const prev = s.shares[s.shares.length - 2] ?? latest;
    const delta = latest - prev;
    const trend = delta > 0.005 ? "↑" : delta < -0.005 ? "↓" : "→";
    const trendColor = delta > 0.005 ? "#1db954" : delta < -0.005 ? "#d94f4f" : C_MUTED;
    svg.appendChild(text(latestX, y + 26, `${(latest * 100).toFixed(1)}%`, {
      "text-anchor": "end", class: "num", "font-size": 12, fill: C_INK,
    }));
    svg.appendChild(text(latestX + 22, y + 26, trend, {
      "text-anchor": "end", "font-size": 13, "font-weight": 700, fill: trendColor,
    }));
  });

  return svg;
}
