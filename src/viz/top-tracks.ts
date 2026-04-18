import { mkSvg, rect, text, line, attachHover, C_ACCENT, C_INK, C_RULE } from "../lib/util";
import { fmtHours, fmtNum, type DataBundle } from "../lib/data";

export function renderTopTracks(data: DataBundle, n = 25): SVGSVGElement {
  const W = 900;
  const rowH = 24;
  const marginT = 32;
  const H = marginT + n * rowH + 12;
  const svg = mkSvg(W, H);

  const rows = data.topTracks.slice(0, n);
  const max = rows[0]?.plays ?? 1;

  const rankW = 32;
  const nameW = 380;
  const barStart = rankW + nameW + 12;
  const barMax = W - barStart - 90;

  svg.appendChild(text(rankW - 6, 18, "RANK", { "text-anchor": "end", class: "axis-label" }));
  svg.appendChild(text(rankW + 6, 18, "TRACK · ARTIST", { class: "axis-label" }));
  svg.appendChild(text(barStart + barMax + 8, 18, "PLAYS", { class: "axis-label" }));
  svg.appendChild(line(0, 24, W, 24, { stroke: C_RULE, "stroke-width": 1 }));

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const y = marginT + i * rowH;
    const barW = (r.plays / max) * barMax;

    svg.appendChild(text(rankW - 6, y + 16, String(i + 1).padStart(2, "0"), {
      "text-anchor": "end", class: "num", fill: "#9aa0a9",
    }));
    const label = `${r.t}  ·  ${r.a}`;
    svg.appendChild(text(rankW + 6, y + 16, label.length > 50 ? label.slice(0, 49) + "…" : label, {
      "font-size": 13, fill: C_INK,
    }));

    svg.appendChild(rect(barStart, y + 8, barMax, rowH - 16, { fill: "#f4f4f1" }));
    const bar = rect(barStart, y + 8, Math.max(1, barW), rowH - 16, { fill: C_ACCENT });
    attachHover(bar, `${r.t} — ${r.a}  ${fmtNum(r.plays)} plays  ${fmtHours(r.ms)}`);
    svg.appendChild(bar);

    svg.appendChild(text(barStart + barMax + 8, y + 16, String(r.plays), { class: "num", "font-size": 12 }));

    if (i < rows.length - 1) {
      svg.appendChild(line(0, y + rowH, W, y + rowH, { stroke: "#f4f4f1", "stroke-width": 1 }));
    }
  }

  return svg;
}
