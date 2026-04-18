import { mkSvg, path, text, line, circle, attachHover, C_ACCENT, C_RULE, C_GRID } from "../lib/util";
import { fmtHours, type DataBundle } from "../lib/data";

export function renderCumulative(data: DataBundle): SVGSVGElement {
  const series = data.cumulative;
  const W = 900;
  const H = 320;
  const marginL = 70;
  const marginR = 20;
  const marginT = 24;
  const marginB = 40;
  const plotW = W - marginL - marginR;
  const plotH = H - marginT - marginB;
  const svg = mkSvg(W, H);

  const start = new Date(series[0].ym + "-01").getTime();
  const end = new Date(series[series.length - 1].ym + "-01").getTime();
  const span = end - start || 1;
  const max = series[series.length - 1].ms;
  const maxH = max / 3600_000;
  const niceMax = Math.ceil(maxH / 500) * 500;

  const xs = (ts: number) => marginL + ((ts - start) / span) * plotW;
  const ys = (ms: number) => marginT + plotH - (ms / 3600_000 / niceMax) * plotH;

  for (let i = 0; i <= 5; i++) {
    const v = (niceMax * i) / 5;
    const y = marginT + plotH - (v / niceMax) * plotH;
    svg.appendChild(line(marginL, y, marginL + plotW, y, {
      stroke: i === 0 ? C_RULE : C_GRID, "stroke-width": 1,
      ...(i === 0 ? {} : { "stroke-dasharray": "2 2" }),
    }));
    svg.appendChild(text(marginL - 8, y + 4, String(v), {
      "text-anchor": "end", class: "axis num",
    }));
  }

  for (const y of data.totals.years) {
    const t = new Date(`${y}-01-01`).getTime();
    if (t < start || t > end) continue;
    const x = xs(t);
    svg.appendChild(line(x, marginT, x, marginT + plotH, {
      stroke: C_GRID, "stroke-width": 1, "stroke-dasharray": "2 2",
    }));
    svg.appendChild(text(x, H - marginB + 14, y, {
      "text-anchor": "middle", class: "axis num",
    }));
  }

  // path
  let d = "";
  series.forEach((r, i) => {
    const x = xs(new Date(r.ym + "-01").getTime());
    const y = ys(r.ms);
    d += (i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`);
  });
  const area = `${d} L ${xs(end)} ${marginT + plotH} L ${marginL} ${marginT + plotH} Z`;
  svg.appendChild(path(area, { fill: "rgba(29, 185, 84, 0.12)" }));
  svg.appendChild(path(d, { fill: "none", stroke: C_ACCENT, "stroke-width": 2 }));

  // endpoint marker + final value
  const last = series[series.length - 1];
  const lx = xs(end);
  const ly = ys(last.ms);
  svg.appendChild(circle(lx, ly, 4, { fill: C_ACCENT }));
  svg.appendChild(text(lx - 8, ly - 8, fmtHours(last.ms), {
    "text-anchor": "end", class: "num", "font-size": 12, "font-weight": 600,
  }));

  // hover dots (sparse)
  series.forEach((r, i) => {
    if (i % 3 !== 0 && i !== series.length - 1) return;
    const x = xs(new Date(r.ym + "-01").getTime());
    const y = ys(r.ms);
    const c = circle(x, y, 3, { fill: "transparent", stroke: "transparent" });
    attachHover(c, `${r.ym}  ${fmtHours(r.ms)}`);
    c.setAttribute("r", "8");
    svg.appendChild(c);
  });

  svg.appendChild(text(marginL, marginT - 10, "CUMULATIVE HOURS", { class: "axis-label" }));

  return svg;
}
