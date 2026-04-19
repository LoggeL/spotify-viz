import { mkSvg, circle, line, text, attachHover, C_ACCENT, C_INK, C_MUTED, C_WARN, C_GRID } from "../lib/util";
import { fmtHours, fmtNum, type DataBundle, type SkipArtist } from "../lib/data";

export function renderSkipRate(data: DataBundle): HTMLElement {
  const rows = data.skipRate;
  const stats = data.skipStats;

  // baseline: prefer skipStats, else compute weighted avg from rows
  let baseline = 0;
  let avgSkipSecAll = 0;
  if (stats && stats.globalExposures > 0) {
    baseline = stats.globalRate;
    avgSkipSecAll = stats.avgSkipMs / 1000;
  } else {
    let sExp = 0, sSkips = 0, sSkipMs = 0;
    for (const r of rows) { sExp += r.exp; sSkips += r.skips; sSkipMs += r.skipMs; }
    baseline = sExp > 0 ? sSkips / sExp : 0;
    avgSkipSecAll = sSkips > 0 ? (sSkipMs / sSkips) / 1000 : 0;
  }

  const colorFor = (rate: number): string => {
    if (rate > baseline + 0.03) return C_WARN;
    if (rate < baseline - 0.03) return C_ACCENT;
    return C_MUTED;
  };

  // ---------- scatter ----------
  const W = 940, H = 560;
  const marginL = 64, marginR = 180, marginT = 70, marginB = 44;
  const plotW = W - marginL - marginR;
  const plotH = H - marginT - marginB;
  const svg = mkSvg(W, H);

  svg.appendChild(text(marginL, 26,
    `you skip ${(baseline * 100).toFixed(1)}% of plays  ·  when skipping, bail after ~${avgSkipSecAll.toFixed(0)} sec  ·  ${fmtNum(rows.length)} artists analyzed (\u226540 plays)`,
    { class: "axis-label", fill: C_INK, "font-size": 12 }));

  const expVals = rows.map(r => r.exp);
  const minExp = Math.max(1, Math.min(...expVals));
  const maxExp = Math.max(...expVals, minExp + 1);
  const logMin = Math.log10(minExp);
  const logMax = Math.log10(maxExp);
  const logSpan = logMax - logMin || 1;
  const xs = (e: number) => marginL + ((Math.log10(Math.max(1, e)) - logMin) / logSpan) * plotW;
  const ys = (r: number) => marginT + plotH - r * plotH;

  const maxMs = rows.reduce((m, r) => Math.max(m, r.ms), 0) || 1;
  const radiusFor = (ms: number) => Math.max(3, Math.min(18, 3 + Math.sqrt(ms / maxMs) * 14));

  for (const p of [0, 0.25, 0.5, 0.75, 1]) {
    const y = ys(p);
    svg.appendChild(line(marginL, y, marginL + plotW, y, {
      stroke: C_GRID, "stroke-width": 1, "stroke-dasharray": "2 2",
    }));
    svg.appendChild(text(marginL - 8, y + 4, `${(p * 100).toFixed(0)}%`, {
      "text-anchor": "end", class: "axis num",
    }));
  }

  const ticks = [50, 100, 200, 500, 1000, 2000, 5000].filter(t => t >= minExp && t <= maxExp);
  for (const t of ticks) {
    const x = xs(t);
    svg.appendChild(line(x, marginT, x, marginT + plotH, {
      stroke: C_GRID, "stroke-width": 1, "stroke-dasharray": "2 2",
    }));
    svg.appendChild(text(x, H - marginB + 14, fmtNum(t), {
      "text-anchor": "middle", class: "axis num",
    }));
  }

  const byLine = ys(baseline);
  svg.appendChild(line(marginL, byLine, marginL + plotW, byLine, {
    stroke: C_ACCENT, "stroke-width": 1.2, "stroke-dasharray": "4 3",
  }));
  svg.appendChild(text(marginL + plotW + 8, byLine + 4,
    `your avg: ${(baseline * 100).toFixed(1)}%`, {
      class: "num", "font-size": 11, "font-weight": 600, fill: C_ACCENT,
    }));

  svg.appendChild(text(marginL, marginT - 10, "SKIP RATE", { class: "axis-label" }));
  svg.appendChild(text(marginL + plotW / 2, H - 8, "PLAYS (log)", {
    "text-anchor": "middle", class: "axis-label",
  }));

  const dotRadii: number[] = [];
  for (const r of rows) {
    const cx = xs(r.exp);
    const cy = ys(r.rate);
    const rad = radiusFor(r.ms);
    dotRadii.push(rad);
    const color = colorFor(r.rate);
    const c = circle(cx, cy, rad, {
      fill: color, "fill-opacity": 0.55, stroke: color, "stroke-width": 1,
    });
    attachHover(c,
      `${r.a}  ${(r.rate * 100).toFixed(1)}% skip · ${fmtNum(r.exp)} plays · bail @ ${r.avgSkipSec.toFixed(0)}s · ${fmtHours(r.ms)}`);
    svg.appendChild(c);
  }

  // labels: top-6 by |rate - baseline| among high-exposure rows
  const sortedByExp = [...rows].map((r, i) => ({ r, i })).sort((a, b) => b.r.exp - a.r.exp);
  const topHalf = new Set(sortedByExp.slice(0, Math.max(1, Math.ceil(sortedByExp.length / 2))).map(o => o.i));
  const ranked = rows
    .map((r, i) => ({ r, i, d: Math.abs(r.rate - baseline) }))
    .filter(o => topHalf.has(o.i))
    .sort((a, b) => b.d - a.d)
    .slice(0, 6);
  for (const { r, i } of ranked) {
    const cx = xs(r.exp);
    const cy = ys(r.rate);
    const rad = dotRadii[i];
    const name = r.a.length > 22 ? r.a.slice(0, 21) + "\u2026" : r.a;
    svg.appendChild(text(cx + rad + 4, cy + 4, name, {
      "font-size": 11, "font-weight": 600, fill: colorFor(r.rate),
    }));
  }

  // ---------- drill-down: which tracks drive the skips ----------
  // Pick 8 artists with the biggest positive delta above baseline that have
  // at least one track responsible for ≥3 skips — those are the actionable cases
  // where the skip rate is explained by specific tracks rather than an overall vibe.
  const candidates: SkipArtist[] = rows
    .filter(r => r.rate > baseline + 0.03 && r.skips >= 10)
    .filter(r => (r.topSkipTracks?.[0]?.skip ?? 0) >= 3)
    .sort((a, b) => (b.rate - a.rate))
    .slice(0, 8);

  const wrap = document.createElement("div");
  wrap.className = "skip-wrap";
  wrap.appendChild(svg);

  if (candidates.length) {
    const drill = document.createElement("div");
    drill.className = "skip-drill";
    const h = document.createElement("div");
    h.className = "skip-drill-head";
    h.textContent = `which tracks drive the skips — top ${candidates.length} high-skip artists, their most-skipped songs (click a song to search)`;
    drill.appendChild(h);

    const grid = document.createElement("div");
    grid.className = "skip-drill-grid";

    for (const a of candidates) {
      const card = document.createElement("div");
      card.className = "skip-card";

      const title = document.createElement("div");
      title.className = "skip-card-title";
      title.innerHTML = `<span class="a">${escapeHtml(a.a)}</span>` +
        `<span class="rate">${(a.rate * 100).toFixed(0)}%</span>`;
      card.appendChild(title);

      const meta = document.createElement("div");
      meta.className = "skip-card-meta";
      meta.textContent = `${fmtNum(a.skips)} skips · ${fmtNum(a.exp)} plays · bail @ ${a.avgSkipSec.toFixed(0)}s · ${fmtHours(a.ms)}`;
      card.appendChild(meta);

      const list = document.createElement("ul");
      list.className = "skip-track-list";
      for (const t of a.topSkipTracks ?? []) {
        const li = document.createElement("li");
        const total = t.skip + t.full;
        const pct = total ? Math.round((t.skip / total) * 100) : 0;
        const link = document.createElement("a");
        link.href = `https://open.spotify.com/search/${encodeURIComponent(`${a.a} ${t.t}`)}`;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.innerHTML =
          `<span class="t">${escapeHtml(t.t)}</span>` +
          `<span class="bar"><span class="bar-skip" style="width:${pct}%"></span></span>` +
          `<span class="n skip">${t.skip}</span>` +
          `<span class="n full">${t.full}</span>`;
        li.appendChild(link);
        list.appendChild(li);
      }
      card.appendChild(list);

      const legend = document.createElement("div");
      legend.className = "skip-card-legend";
      legend.innerHTML = `<span class="sk">skip</span> · <span class="fu">full</span>`;
      card.appendChild(legend);

      grid.appendChild(card);
    }
    drill.appendChild(grid);
    wrap.appendChild(drill);
  }

  return wrap;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => (
    c === "&" ? "&amp;" :
    c === "<" ? "&lt;" :
    c === ">" ? "&gt;" :
    c === "\"" ? "&quot;" : "&#39;"
  ));
}
