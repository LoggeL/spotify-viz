import { mkSvg, rect, text, line, attachHover, C_INK, C_RULE } from "../lib/util";
import { fmtHours, fmtNum, type DataBundle } from "../lib/data";

export function renderTopArtists(data: DataBundle, n = 25): SVGSVGElement {
  const W = 900;
  const rowH = 24;
  const marginT = 32;
  const marginB = 12;
  const H = marginT + n * rowH + marginB;
  const svg = mkSvg(W, H);

  const rows = data.topArtists.slice(0, n);
  const max = rows[0]?.plays ?? 1;

  const rankW = 32;
  const nameW = 220;
  const barStart = rankW + nameW + 12;
  const barMax = W - barStart - 180;

  // header
  svg.appendChild(text(rankW - 6, 18, "RANK", { "text-anchor": "end", class: "axis-label" }));
  svg.appendChild(text(rankW + 6, 18, "ARTIST", { class: "axis-label" }));
  svg.appendChild(text(barStart + barMax + 8, 18, "PLAYS", { class: "axis-label" }));
  svg.appendChild(text(W - 8, 18, "HOURS", { "text-anchor": "end", class: "axis-label" }));
  svg.appendChild(line(0, 24, W, 24, { stroke: C_RULE, "stroke-width": 1 }));

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const y = marginT + i * rowH;
    const barW = (r.plays / max) * barMax;

    svg.appendChild(text(rankW - 6, y + 16, String(i + 1).padStart(2, "0"), {
      "text-anchor": "end", class: "num", fill: "#9aa0a9",
    }));
    const name = r.a.length > 26 ? r.a.slice(0, 25) + "…" : r.a;
    svg.appendChild(text(rankW + 6, y + 16, name, { "font-size": 13, fill: C_INK }));

    // track (bg)
    svg.appendChild(rect(barStart, y + 8, barMax, rowH - 16, { fill: "#f4f4f1" }));
    // bar
    const bar = rect(barStart, y + 8, Math.max(1, barW), rowH - 16, { fill: C_INK });
    attachHover(bar, `${r.a}  ${fmtNum(r.plays)} plays  ${fmtHours(r.ms)}`);
    svg.appendChild(bar);

    svg.appendChild(text(barStart + barMax + 8, y + 16, fmtNum(r.plays), { class: "num", "font-size": 12 }));
    svg.appendChild(text(W - 8, y + 16, fmtHours(r.ms), {
      "text-anchor": "end", class: "num", fill: "#6b7380", "font-size": 12,
    }));

    if (i < rows.length - 1) {
      svg.appendChild(line(0, y + rowH, W, y + rowH, { stroke: "#f4f4f1", "stroke-width": 1 }));
    }
  }

  return svg;
}
