import { mkSvg, rect, text, svgNS, attachHover, C_INK } from "../lib/util";
import { fmtHours, fmtNum, type DataBundle } from "../lib/data";

function flag(cc: string, x: number, y: number, w = 22, h = 16): SVGElement {
  const img = svgNS("image", {
    x, y,
    width: w,
    height: h,
    href: `https://flagcdn.com/${cc.toLowerCase()}.svg`,
    preserveAspectRatio: "xMidYMid slice",
  });
  return img;
}

export function renderCountries(data: DataBundle): SVGSVGElement {
  const rows = data.countries.slice(0, 15);
  const totalPlays = rows.reduce((s, r) => s + r.n, 0);
  const W = 700;
  const rowH = 28;
  const marginT = 32;
  const H = marginT + rows.length * rowH + 8;
  const svg = mkSvg(W, H);

  const max = rows[0]?.n ?? 1;
  const flagX = 20;
  const labelW = 90;
  const barStart = flagX + labelW + 10;
  const barMax = W - barStart - 210;

  svg.appendChild(text(flagX, 18, "COUNTRY", { class: "axis-label" }));
  svg.appendChild(text(barStart + barMax + 10, 18, "PLAYS", { class: "axis-label" }));
  svg.appendChild(text(W - 90, 18, "HOURS", { class: "axis-label" }));
  svg.appendChild(text(W - 10, 18, "SHARE", { "text-anchor": "end", class: "axis-label" }));

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const y = marginT + i * rowH;
    const barW = (r.n / max) * barMax;
    const share = (r.n / totalPlays) * 100;

    svg.appendChild(flag(r.cc, flagX, y + 5));
    svg.appendChild(text(flagX + 28, y + 17, r.cc, { "font-size": 13, "font-weight": 500 }));

    svg.appendChild(rect(barStart, y + 8, barMax, rowH - 16, { fill: "#f4f4f1" }));
    const bar = rect(barStart, y + 8, Math.max(1, barW), rowH - 16, { fill: C_INK });
    attachHover(bar, `${r.cc}  ${fmtNum(r.n)} plays  ${fmtHours(r.ms)}  ${share.toFixed(2)}%`);
    svg.appendChild(bar);

    svg.appendChild(text(barStart + barMax + 10, y + 17, fmtNum(r.n), { class: "num", "font-size": 12 }));
    svg.appendChild(text(W - 90, y + 17, fmtHours(r.ms), {
      class: "num", "font-size": 12, fill: "#6b7380",
    }));
    svg.appendChild(text(W - 10, y + 17, `${share.toFixed(1)}%`, {
      "text-anchor": "end", class: "num", "font-size": 12, fill: "#6b7380",
    }));
  }

  return svg;
}
