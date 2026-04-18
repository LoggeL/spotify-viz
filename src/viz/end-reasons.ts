import { mkSvg, rect, text, attachHover, C_INK } from "../lib/util";
import { fmtHours, fmtNum, type DataBundle } from "../lib/data";

const LABELS: Record<string, string> = {
  trackdone: "played to end",
  fwdbtn: "skipped forward",
  backbtn: "jumped back",
  endplay: "app closed",
  logout: "logout",
  "unexpected-exit": "crash",
  "unexpected-exit-while-paused": "crash (paused)",
  clickrow: "clickrow",
  playbtn: "play button",
  remote: "remote",
  appload: "app load",
  trackerror: "track error",
};

export function renderEndReasons(data: DataBundle): SVGSVGElement {
  const rows = data.endReasons;
  const total = rows.reduce((s, r) => s + r.n, 0);
  const W = 720;
  const rowH = 26;
  const marginT = 32;
  const H = marginT + rows.length * rowH + 8;
  const svg = mkSvg(W, H);

  const max = rows[0]?.n ?? 1;
  const labelW = 160;
  const barStart = labelW + 10;
  const barMax = W - barStart - 220;

  svg.appendChild(text(20, 18, "REASON", { class: "axis-label" }));
  svg.appendChild(text(barStart + barMax + 10, 18, "PLAYS", { class: "axis-label" }));
  svg.appendChild(text(W - 90, 18, "HOURS", { class: "axis-label" }));
  svg.appendChild(text(W - 10, 18, "SHARE", { "text-anchor": "end", class: "axis-label" }));

  rows.forEach((r, i) => {
    const y = marginT + i * rowH;
    const barW = (r.n / max) * barMax;
    const share = (r.n / total) * 100;

    svg.appendChild(text(20, y + 17, LABELS[r.r] || r.r || "(null)", { "font-size": 13 }));
    svg.appendChild(rect(barStart, y + 7, barMax, rowH - 14, { fill: "#f4f4f1" }));
    const bar = rect(barStart, y + 7, Math.max(1, barW), rowH - 14, { fill: C_INK });
    attachHover(bar, `${r.r}  ${fmtNum(r.n)} plays  ${fmtHours(r.ms)}  ${share.toFixed(2)}%`);
    svg.appendChild(bar);

    svg.appendChild(text(barStart + barMax + 10, y + 17, fmtNum(r.n), { class: "num", "font-size": 12 }));
    svg.appendChild(text(W - 90, y + 17, fmtHours(r.ms), {
      class: "num", "font-size": 12, fill: "#6b7380",
    }));
    svg.appendChild(text(W - 10, y + 17, `${share.toFixed(1)}%`, {
      "text-anchor": "end", class: "num", "font-size": 12, fill: "#6b7380",
    }));
  });

  return svg;
}
