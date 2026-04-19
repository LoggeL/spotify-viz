import { mkSvg, line, path, text, circle, attachHover, C_ACCENT, C_RULE, C_GRID, C_MUTED, C_INK } from "../lib/util";
import { type DataBundle } from "../lib/data";

// Average completed-track length over time, monthly resolution.
// Uses reason_end = "trackdone" plays only, so ms_played ≈ actual song duration.
export function renderSongLength(data: DataBundle): SVGSVGElement | HTMLElement {
  const rows = data.songLength?.filter((r) => r.n >= 10) ?? [];
  if (!rows.length) {
    const p = document.createElement("p");
    p.className = "status"; p.textContent = "Keine song-length daten — run npm run preprocess.";
    return p;
  }

  const W = 900;
  const H = 320;
  const marginL = 54, marginR = 130, marginT = 28, marginB = 36;
  const plotW = W - marginL - marginR;
  const plotH = H - marginT - marginB;
  const svg = mkSvg(W, H);

  const minMs = Math.min(...rows.map((r) => r.avgMs));
  const maxMs = Math.max(...rows.map((r) => r.avgMs));
  // pad y range
  const range = Math.max(maxMs - minMs, 10_000);
  const yMin = Math.max(0, minMs - range * 0.25);
  const yMax = maxMs + range * 0.25;

  const xAt = (i: number) => marginL + (i / Math.max(1, rows.length - 1)) * plotW;
  const yAt = (v: number) => marginT + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

  // horizontal gridlines at 30s increments
  const gridStep = 30_000;
  const g0 = Math.ceil(yMin / gridStep) * gridStep;
  for (let v = g0; v <= yMax; v += gridStep) {
    const y = yAt(v);
    svg.appendChild(line(marginL, y, marginL + plotW, y, { stroke: C_GRID, "stroke-width": 1, "stroke-dasharray": "2 2" }));
    const mm = Math.floor(v / 60_000);
    const ss = Math.round((v % 60_000) / 1000).toString().padStart(2, "0");
    svg.appendChild(text(marginL - 8, y + 4, `${mm}:${ss}`, { "text-anchor": "end", class: "axis num" }));
  }
  svg.appendChild(line(marginL, marginT + plotH, marginL + plotW, marginT + plotH, { stroke: C_RULE, "stroke-width": 1 }));

  // rolling 3-month smoothed line
  const smoothed = rows.map((_, i) => {
    const lo = Math.max(0, i - 1);
    const hi = Math.min(rows.length - 1, i + 1);
    let s = 0, n = 0;
    for (let k = lo; k <= hi; k++) { s += rows[k].avgMs; n++; }
    return s / n;
  });

  // area under smoothed
  let area = `M ${xAt(0)} ${yAt(yMin)}`;
  smoothed.forEach((v, i) => { area += ` L ${xAt(i)} ${yAt(v)}`; });
  area += ` L ${xAt(smoothed.length - 1)} ${yAt(yMin)} Z`;
  svg.appendChild(path(area, { fill: C_ACCENT, opacity: 0.12 }));

  // raw monthly dots
  rows.forEach((r, i) => {
    const c = circle(xAt(i), yAt(r.avgMs), 1.6, { fill: C_MUTED, opacity: 0.55 });
    attachHover(c, `${r.ym}  avg ${fmtMmSs(r.avgMs)} (${r.n} plays)`);
    svg.appendChild(c);
  });

  // smoothed line
  let ln = "";
  smoothed.forEach((v, i) => { ln += (i === 0 ? "M " : " L ") + `${xAt(i)} ${yAt(v)}`; });
  svg.appendChild(path(ln, { fill: "none", stroke: C_ACCENT, "stroke-width": 2 }));

  // year ticks
  let lastYear = "";
  rows.forEach((r, i) => {
    const y = r.ym.slice(0, 4);
    if (y !== lastYear) {
      lastYear = y;
      const xx = xAt(i);
      svg.appendChild(line(xx, marginT + plotH, xx, marginT + plotH + 4, { stroke: C_RULE, "stroke-width": 1 }));
      svg.appendChild(text(xx, H - marginB + 14, y, { "text-anchor": "middle", class: "axis num" }));
    }
  });

  // overall stats on right
  const overall = rows.reduce((s, r) => ({ sum: s.sum + r.avgMs * r.n, n: s.n + r.n }), { sum: 0, n: 0 });
  const avgAll = overall.sum / overall.n;
  const firstAvg = rows.slice(0, 6).reduce((s, r) => s + r.avgMs, 0) / 6;
  const lastAvg = rows.slice(-6).reduce((s, r) => s + r.avgMs, 0) / 6;
  const delta = lastAvg - firstAvg;
  const deltaSign = delta >= 0 ? "+" : "−";
  const trendColor = delta >= 0 ? "#189c49" : "#c43838";

  const rx = marginL + plotW + 14;
  svg.appendChild(text(rx, marginT + 6, "LIFETIME AVG", { class: "axis-label" }));
  svg.appendChild(text(rx, marginT + 24, fmtMmSs(avgAll), { "font-size": 18, "font-weight": 700, class: "num", fill: C_INK }));
  svg.appendChild(text(rx, marginT + 56, "FIRST 6 MO", { class: "axis-label" }));
  svg.appendChild(text(rx, marginT + 72, fmtMmSs(firstAvg), { "font-size": 13, class: "num", fill: C_INK }));
  svg.appendChild(text(rx, marginT + 96, "LAST 6 MO", { class: "axis-label" }));
  svg.appendChild(text(rx, marginT + 112, fmtMmSs(lastAvg), { "font-size": 13, class: "num", fill: C_INK }));
  svg.appendChild(text(rx, marginT + 140, "Δ", { class: "axis-label" }));
  svg.appendChild(text(rx, marginT + 156, `${deltaSign}${fmtMmSs(Math.abs(delta))}`, {
    "font-size": 13, "font-weight": 700, class: "num", fill: trendColor,
  }));

  svg.appendChild(text(marginL, marginT - 10, "AVG SONG LENGTH (TRACKDONE PLAYS)", { class: "axis-label" }));

  return svg;
}

function fmtMmSs(ms: number): string {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}
