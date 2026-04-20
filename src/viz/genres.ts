import { mkSvg, rect, text, line, attachHover, C_ACCENT, C_RULE } from "../lib/util";
import { fmtHours, fmtNum, type DataBundle } from "../lib/data";

export function renderGenres(data: DataBundle, n = 25): SVGSVGElement | HTMLElement {
  if (!data.genres) {
    const el = document.createElement("p");
    el.className = "status";
    el.textContent = "Keine Genre-Daten — run npm run enrich-genres.";
    return el;
  }
  const rows = data.genres.top.slice(0, n);
  const W = 900;
  const rowH = 26;
  const marginT = 48;
  const H = marginT + rows.length * rowH + 8;
  const svg = mkSvg(W, H);

  const max = rows[0]?.plays ?? 1;
  const rankW = 32;
  const nameW = 220;
  const barStart = rankW + nameW + 12;
  const barMax = W - barStart - 240;

  // summary header
  const cov = ((data.genres.coveredPlays / data.genres.totalTopPlays) * 100).toFixed(1);
  svg.appendChild(text(16, 18, `${fmtNum(data.genres.uniqueGenres)} unique · ${data.genres.enriched} artists gecovered · ${cov}% der top-500 plays`, {
    class: "axis-label",
  }));

  svg.appendChild(text(rankW + 6, 38, "GENRE", { class: "axis-label" }));
  svg.appendChild(text(barStart + barMax + 10, 38, "PLAYS", { class: "axis-label" }));
  svg.appendChild(text(W - 90, 38, "HOURS", { class: "axis-label" }));
  svg.appendChild(text(W - 10, 38, "ARTISTS", { "text-anchor": "end", class: "axis-label" }));
  svg.appendChild(line(0, 44, W, 44, { stroke: C_RULE, "stroke-width": 1 }));

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const y = marginT + i * rowH;
    const barW = (r.plays / max) * barMax;

    svg.appendChild(text(rankW - 6, y + 17, String(i + 1).padStart(2, "0"), {
      "text-anchor": "end", class: "num", fill: "#9aa0a9",
    }));
    svg.appendChild(text(rankW + 6, y + 17, r.g.length > 26 ? r.g.slice(0, 25) + "…" : r.g, {
      "font-size": 13,
    }));

    svg.appendChild(rect(barStart, y + 9, barMax, rowH - 18, { fill: "#f4f4f1" }));
    const bar = rect(barStart, y + 9, Math.max(1, barW), rowH - 18, { fill: C_ACCENT });
    const sampleList = r.sampleArtists.slice(0, 4).join(", ");
    const topTracks = (r.topTracks || []).slice(0, 5).map((x) => `${x.a} – ${x.t} (${fmtNum(x.plays)})`).join("\n");
    attachHover(bar, `${r.g}  ${fmtNum(r.plays)} plays · ${fmtHours(r.ms)} · ${r.artists} artists  —  e.g. ${sampleList}${topTracks ? `\n\nTop songs:\n${topTracks}` : ""}`);
    svg.appendChild(bar);

    svg.appendChild(text(barStart + barMax + 10, y + 17, fmtNum(r.plays), {
      class: "num", "font-size": 12,
    }));
    svg.appendChild(text(W - 90, y + 17, fmtHours(r.ms), {
      class: "num", "font-size": 12, fill: "#6b7380",
    }));
    svg.appendChild(text(W - 10, y + 17, fmtNum(r.artists), {
      "text-anchor": "end", class: "num", "font-size": 12, fill: "#6b7380",
    }));
  }

  return svg;
}
