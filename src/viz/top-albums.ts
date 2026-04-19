import { mkSvg, rect, text, line, attachHover, link, spotifySearchUrl, C_INK, C_RULE } from "../lib/util";
import { fmtHours, fmtNum, type DataBundle } from "../lib/data";

export function renderTopAlbums(data: DataBundle, n = 25): SVGSVGElement {
  const W = 900;
  const rowH = 24;
  const marginT = 32;
  const rows = data.topAlbums.slice(0, n);
  const H = marginT + rows.length * rowH + 12;
  const svg = mkSvg(W, H);

  const max = rows[0]?.ms ?? 1;
  const rankW = 32;
  const nameW = 420;
  const barStart = rankW + nameW + 12;
  const barMax = W - barStart - 180;

  svg.appendChild(text(rankW - 6, 18, "RANK", { "text-anchor": "end", class: "axis-label" }));
  svg.appendChild(text(rankW + 6, 18, "ALBUM · ARTIST", { class: "axis-label" }));
  svg.appendChild(text(barStart + barMax + 8, 18, "HOURS", { class: "axis-label" }));
  svg.appendChild(text(W - 8, 18, "PLAYS", { "text-anchor": "end", class: "axis-label" }));
  svg.appendChild(line(0, 24, W, 24, { stroke: C_RULE, "stroke-width": 1 }));

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const y = marginT + i * rowH;
    const barW = (r.ms / max) * barMax;

    svg.appendChild(text(rankW - 6, y + 16, String(i + 1).padStart(2, "0"), {
      "text-anchor": "end", class: "num", fill: "#9aa0a9",
    }));
    const label = `${r.al}  ·  ${r.a}`;
    const nameEl = text(rankW + 6, y + 16, label.length > 56 ? label.slice(0, 55) + "…" : label, {
      "font-size": 13, class: "row-link",
    });

    svg.appendChild(rect(barStart, y + 8, barMax, rowH - 16, { fill: "#f4f4f1" }));
    const bar = rect(barStart, y + 8, Math.max(1, barW), rowH - 16, { fill: C_INK });
    attachHover(bar, `${r.al} — ${r.a}  ${fmtHours(r.ms)}  ${fmtNum(r.plays)} plays  · click to open on Spotify`);
    svg.appendChild(link(spotifySearchUrl(`${r.a} ${r.al}`), nameEl, bar));

    svg.appendChild(text(barStart + barMax + 8, y + 16, fmtHours(r.ms), {
      class: "num", "font-size": 12,
    }));
    svg.appendChild(text(W - 8, y + 16, fmtNum(r.plays), {
      "text-anchor": "end", class: "num", fill: "#6b7380", "font-size": 12,
    }));

    if (i < rows.length - 1) {
      svg.appendChild(line(0, y + rowH, W, y + rowH, { stroke: "#f4f4f1", "stroke-width": 1 }));
    }
  }

  return svg;
}
