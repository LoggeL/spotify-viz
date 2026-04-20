import { fmtNum, type DataBundle } from "../lib/data";

export function renderGenreGuide(data: DataBundle): HTMLElement {
  const wrap = document.createElement("div");
  if (!data.genres) {
    wrap.className = "status";
    wrap.textContent = "Keine Genre-Daten — run npm run enrich-genres.";
    return wrap;
  }

  wrap.className = "genre-guide";
  for (const g of data.genres.top.slice(0, 12)) {
    const card = document.createElement("section");
    card.className = "genre-guide-card";

    const tracks = (g.topTracks || []).slice(0, 5)
      .map((t) => `<li><span class="song">${escapeHtml(t.t)}</span><span class="meta">${escapeHtml(t.a)} · ${fmtNum(t.plays)} plays</span></li>`)
      .join("");

    const artists = g.sampleArtists.slice(0, 5)
      .map((a) => `<li>${escapeHtml(a)}</li>`)
      .join("");

    card.innerHTML = `
      <div class="genre-guide-head">
        <h3>${escapeHtml(g.g)}</h3>
        <div class="genre-guide-stats">${fmtNum(g.plays)} plays · ${fmtNum(g.artists)} artists</div>
      </div>
      <div class="genre-guide-columns">
        <div>
          <div class="genre-guide-label">Top Songs</div>
          <ol>${tracks || "<li>Keine Daten</li>"}</ol>
        </div>
        <div>
          <div class="genre-guide-label">Beispiel-Artists</div>
          <ul>${artists || "<li>Keine Daten</li>"}</ul>
        </div>
      </div>
    `;

    wrap.appendChild(card);
  }
  return wrap;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}
