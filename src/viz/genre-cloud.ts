import { fmtHours, fmtNum, type DataBundle } from "../lib/data";

// Word-cloud-ish tag list where size encodes plays (non-overlapping, just inline flow).
export function renderGenreCloud(data: DataBundle): HTMLElement {
  const wrap = document.createElement("div");
  if (!data.genres) {
    wrap.className = "status";
    wrap.textContent = "Keine Genre-Daten — run npm run enrich-genres.";
    return wrap;
  }
  const rows = data.genres.top.slice(0, 60);
  const max = rows[0]?.plays ?? 1;

  wrap.style.cssText = "display:flex;flex-wrap:wrap;gap:6px 10px;line-height:1.6;padding:8px 4px;";

  for (const r of rows) {
    const weight = r.plays / max;
    const size = 11 + weight * 22;
    const tag = document.createElement("span");
    tag.textContent = r.g;
    tag.title = `${r.g} · ${fmtNum(r.plays)} plays · ${fmtHours(r.ms)} · ${r.artists} artists`;
    tag.style.cssText = `
      font-family: "JetBrains Mono", monospace;
      font-size: ${size.toFixed(1)}px;
      font-weight: ${weight > 0.5 ? 600 : 500};
      color: ${weight > 0.25 ? "#111418" : "#6b7380"};
      padding: 2px 8px;
      background: ${weight > 0.6 ? "rgba(29, 185, 84, 0.18)" : weight > 0.3 ? "rgba(29, 185, 84, 0.10)" : "#f4f4f1"};
      border-radius: 3px;
      white-space: nowrap;
    `;
    wrap.appendChild(tag);
  }

  return wrap;
}
