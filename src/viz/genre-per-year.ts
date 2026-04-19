import { mkSvg, circle, text, line, path, attachHover, PALETTE, C_GRID, C_MUTED, C_RULE } from "../lib/util";
import { fmtNum, type DataBundle } from "../lib/data";

// Bump chart: rank of top-10 genres across years (1 = most played that year).
export function renderGenrePerYear(data: DataBundle): SVGSVGElement | HTMLElement {
  if (!data.genres) {
    const p = document.createElement("p");
    p.className = "status"; p.textContent = "Keine Genre-Daten.";
    return p;
  }

  const years = data.genres.years;
  const yearlyByGenre = data.genres.yearlyByGenre;

  // Rank every genre for every year (1 = most played). Ties get deterministic order.
  // rankByYear[yearIndex] → Map<genre, rank(1-based)>
  const rankByYear: Map<string, number>[] = years.map((_, yi) => {
    const arr = Object.entries(yearlyByGenre)
      .map(([g, row]) => ({ g, plays: row[yi] || 0 }))
      .sort((a, b) => b.plays - a.plays || a.g.localeCompare(b.g));
    const m = new Map<string, number>();
    arr.forEach((r, i) => m.set(r.g, i + 1));
    return m;
  });

  // Total plays per genre (used as a relevance filter + tiebreaker).
  const totals = new Map<string, number>();
  for (const [g, row] of Object.entries(yearlyByGenre)) {
    let s = 0;
    for (const v of row) s += v;
    totals.set(g, s);
  }

  // Pick the 10 genres with the *best average rank* across years. Selecting by
  // total plays previously let niche super-spikes (medieval metal, folk metal)
  // into the top-10 even though they ranked #40+ in most years — the resulting
  // lines dove off-chart every time. Average rank keeps the bump chart legible:
  // the lines you see are ones that actually stay in the upper ranks.
  const topTotal = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
  const ranked = topTotal.map(([g]) => {
    const ranks = years.map((_, yi) => rankByYear[yi].get(g) ?? 999);
    const avg = ranks.reduce((s, r) => s + r, 0) / ranks.length;
    return { g, avg, total: totals.get(g) || 0 };
  });
  const selected = ranked
    .sort((a, b) => a.avg - b.avg || b.total - a.total)
    .slice(0, 10)
    .map((x) => x.g);

  // Auto-size the y-axis to cover every selected genre's worst rank. No upper
  // cap — niche-then-dominant genres (anime, medieval metal, etc.) can spike
  // from #1 to #35 across years, and the whole point of the chart is to show
  // those swings. Row height adapts to the rank range instead.
  let worst = 10;
  for (const g of selected) {
    for (let yi = 0; yi < years.length; yi++) {
      const r = rankByYear[yi].get(g);
      if (r && r > worst) worst = r;
    }
  }
  const MAX_RANK = worst;

  const W = 1100;
  // Grow vertical space so each rank line has enough room even when the range
  // blows out to 30+. Minimum plot height 430, ~14px per rank.
  const rowPx = 14;
  const plotH = Math.max(430, (MAX_RANK - 1) * rowPx);
  const T = 50, B = 40;
  const H = plotH + T + B;
  // L leaves room for the rank axis (#N) AND the genre name that labels each line's
  // starting rank. R leaves room for the genre name at the line's ending rank.
  const L = 180, R = 180;
  const plotW = W - L - R;
  const svg = mkSvg(W, H);

  const xs = (yi: number) => years.length === 1
    ? L + plotW / 2
    : L + (yi / (years.length - 1)) * plotW;
  // Clamp the y-position so any rank beyond MAX_RANK sticks to the bottom rail
  // instead of drifting off the chart.
  const ys = (rank: number) => T + ((Math.min(rank, MAX_RANK) - 1) / (MAX_RANK - 1)) * plotH;

  // Gridlines: one per rank; label spacing scales down as rank range grows.
  const labelEvery = MAX_RANK <= 12 ? 1 : MAX_RANK <= 20 ? 2 : MAX_RANK <= 40 ? 5 : 10;
  for (let r = 1; r <= MAX_RANK; r++) {
    const y = ys(r);
    svg.appendChild(line(L, y, L + plotW, y, {
      stroke: r === 1 ? C_RULE : C_GRID,
      "stroke-width": 1,
      ...(r === 1 ? {} : { "stroke-dasharray": "2 3" }),
    }));
    if (r === 1 || r === MAX_RANK || r % labelEvery === 0) {
      svg.appendChild(text(L - 8, y + 4, `#${r}`, {
        "text-anchor": "end", class: "axis num", fill: C_MUTED,
      }));
    }
  }

  // Year labels at top.
  years.forEach((y, yi) => {
    svg.appendChild(text(xs(yi), T - 12, y, {
      "text-anchor": "middle", class: "axis num", "font-weight": 600,
    }));
    // faint vertical guide
    svg.appendChild(line(xs(yi), T, xs(yi), T + plotH, {
      stroke: C_GRID, "stroke-width": 1, "stroke-dasharray": "2 3",
    }));
  });

  const truncate = (s: string) => s.length > 22 ? s.slice(0, 21) + "…" : s;

  // Draw each selected genre.
  selected.forEach((g, gi) => {
    const color = PALETTE[gi % PALETTE.length];
    const row = yearlyByGenre[g] || [];

    // Per-year points. Since MAX_RANK is auto-sized to the worst rank a selected
    // genre ever occupies, no clamping or fading is needed — every point is real.
    const pts = years.map((_, yi) => {
      const rank = rankByYear[yi].get(g) || MAX_RANK;
      return { yi, x: xs(yi), y: ys(rank), rank, plays: row[yi] || 0 };
    });

    // Single polyline for the whole series.
    const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    svg.appendChild(path(d, {
      fill: "none",
      stroke: color,
      "stroke-width": 2.5,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    }));

    // Dots on each year.
    pts.forEach((p) => {
      const c = circle(p.x, p.y, 4, {
        fill: color, stroke: "#fff", "stroke-width": 2,
      });
      attachHover(c, `${g} · ${years[p.yi]} · rank #${p.rank} · ${fmtNum(p.plays)} plays`);
      svg.appendChild(c);
    });

    // Labels at both ends (unconditional — no clamping means no pile-up at #12).
    const first = pts[0];
    svg.appendChild(text(L - 40, first.y + 4, truncate(g), {
      "text-anchor": "end", fill: color, "font-size": 11, "font-weight": 600,
    }));
    const last = pts[pts.length - 1];
    svg.appendChild(text(L + plotW + 8, last.y + 4, truncate(g), {
      "text-anchor": "start", fill: color, "font-size": 11, "font-weight": 600,
    }));
  });

  return svg;
}
