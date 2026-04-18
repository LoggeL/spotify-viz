import { mkSvg, rect, text, line, attachHover, C_INK, C_RULE, C_GRID } from "../lib/util";
import { fmtHours, fmtNum, type DataBundle } from "../lib/data";

export function renderSessions(data: DataBundle): SVGSVGElement {
  const W = 900;
  const H = 320;
  const marginL = 56;
  const marginR = 24;
  const marginT = 28;
  const marginB = 52;
  const plotW = W - marginL - marginR;
  const plotH = H - marginT - marginB;
  const svg = mkSvg(W, H);

  const hist = data.sessions.hist;
  const max = Math.max(...hist.map((h) => h.n), 1);
  const niceMax = Math.ceil(max / 10000) * 10000;
  const barSlot = plotW / hist.length;
  const barW = barSlot * 0.7;

  for (let i = 0; i <= 5; i++) {
    const v = (niceMax * i) / 5;
    const y = marginT + plotH - (v / niceMax) * plotH;
    svg.appendChild(line(marginL, y, marginL + plotW, y, {
      stroke: i === 0 ? C_RULE : C_GRID, "stroke-width": 1,
      ...(i === 0 ? {} : { "stroke-dasharray": "2 2" }),
    }));
    svg.appendChild(text(marginL - 8, y + 4, fmtNum(v), {
      "text-anchor": "end", class: "axis num",
    }));
  }

  hist.forEach((h, i) => {
    const bh = (h.n / niceMax) * plotH;
    const x = marginL + i * barSlot + (barSlot - barW) / 2;
    const y = marginT + plotH - bh;
    const bar = rect(x, y, barW, bh, { fill: C_INK });
    attachHover(bar, `${h.bucket} tracks  ${fmtNum(h.n)} sessions  ${fmtHours(h.ms)}`);
    svg.appendChild(bar);
    svg.appendChild(text(x + barW / 2, H - marginB + 14, h.bucket, {
      "text-anchor": "middle", class: "axis num",
    }));
    svg.appendChild(text(x + barW / 2, H - marginB + 26, fmtHours(h.ms), {
      "text-anchor": "middle", class: "axis num", fill: "#9aa0a9", "font-size": 9,
    }));
    svg.appendChild(text(x + barW / 2, y - 6, fmtNum(h.n), {
      "text-anchor": "middle", class: "num", "font-size": 10,
    }));
  });

  svg.appendChild(text(marginL, marginT - 10, "SESSIONS", { class: "axis-label" }));
  svg.appendChild(text(W - marginR, H - 8, "TRACKS PER SESSION", {
    "text-anchor": "end", class: "axis-label",
  }));

  return svg;
}
