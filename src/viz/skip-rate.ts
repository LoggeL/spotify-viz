import { mkSvg, rect, text, line, attachHover, C_WARN, C_RULE, C_GRID } from "../lib/util";
import { fmtHours, fmtNum, type DataBundle } from "../lib/data";

export function renderSkipRate(data: DataBundle, n = 20): SVGSVGElement {
  const rows = data.skipRate.slice(0, n);
  const W = 900;
  const rowH = 24;
  const marginT = 44;
  const H = marginT + rows.length * rowH + 12;
  const svg = mkSvg(W, H);

  const rankW = 28;
  const nameW = 200;
  const barStart = rankW + nameW + 12;
  const barMax = W - barStart - 220;

  svg.appendChild(text(rankW + 6, 18, "ARTIST", { class: "axis-label" }));
  svg.appendChild(text(barStart + barMax + 10, 18, "SKIP %", { class: "axis-label" }));
  svg.appendChild(text(W - 90, 18, "HOURS", { class: "axis-label" }));
  svg.appendChild(text(W - 10, 18, "N", { "text-anchor": "end", class: "axis-label" }));

  for (let p = 0; p <= 100; p += 25) {
    const x = barStart + (p / 100) * barMax;
    svg.appendChild(line(x, 28, x, H - 8, {
      stroke: p === 0 ? C_RULE : C_GRID, "stroke-width": 1,
      ...(p === 0 ? {} : { "stroke-dasharray": "2 2" }),
    }));
    svg.appendChild(text(x, 38, `${p}%`, { "text-anchor": "middle", class: "axis num" }));
  }

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const y = marginT + i * rowH;
    const barW = r.rate * barMax;

    svg.appendChild(text(rankW - 4, y + 16, String(i + 1).padStart(2, "0"), {
      "text-anchor": "end", class: "num", fill: "#9aa0a9",
    }));
    svg.appendChild(text(rankW + 6, y + 16, r.a.length > 24 ? r.a.slice(0, 23) + "…" : r.a, { "font-size": 13 }));

    const bar = rect(barStart, y + 7, Math.max(1, barW), rowH - 14, { fill: C_WARN });
    attachHover(bar, `${r.a}  ${(r.rate * 100).toFixed(1)}% · ${r.skips}/${fmtNum(r.exp)}  ${fmtHours(r.ms)}`);
    svg.appendChild(bar);

    svg.appendChild(text(barStart + barMax + 10, y + 16, `${(r.rate * 100).toFixed(1)}%`, {
      class: "num", "font-size": 12,
    }));
    svg.appendChild(text(W - 90, y + 16, fmtHours(r.ms), {
      class: "num", "font-size": 12, fill: "#6b7380",
    }));
    svg.appendChild(text(W - 10, y + 16, fmtNum(r.exp), {
      "text-anchor": "end", class: "num", fill: "#6b7380", "font-size": 12,
    }));
  }

  return svg;
}
