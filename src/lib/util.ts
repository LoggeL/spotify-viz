export function svgNS(tag: string, attrs: Record<string, string | number> = {}): SVGElement {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag) as SVGElement;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

export function mkSvg(w: number, h: number): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg") as SVGSVGElement;
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.classList.add("viz");
  return svg;
}

export function g(transform?: string): SVGGElement {
  const el = svgNS("g") as SVGGElement;
  if (transform) el.setAttribute("transform", transform);
  return el;
}

export function rect(x: number, y: number, w: number, h: number, attrs: Record<string, string | number> = {}): SVGRectElement {
  return svgNS("rect", { x, y, width: w, height: h, ...attrs }) as SVGRectElement;
}

export function line(x1: number, y1: number, x2: number, y2: number, attrs: Record<string, string | number> = {}): SVGLineElement {
  return svgNS("line", { x1, y1, x2, y2, ...attrs }) as SVGLineElement;
}

export function circle(cx: number, cy: number, r: number, attrs: Record<string, string | number> = {}): SVGCircleElement {
  return svgNS("circle", { cx, cy, r, ...attrs }) as SVGCircleElement;
}

export function path(d: string, attrs: Record<string, string | number> = {}): SVGPathElement {
  return svgNS("path", { d, ...attrs }) as SVGPathElement;
}

export function text(x: number, y: number, content: string, attrs: Record<string, string | number> = {}): SVGTextElement {
  const el = svgNS("text", { x, y, ...attrs }) as SVGTextElement;
  el.textContent = content;
  return el;
}

let tipEl: HTMLDivElement | null = null;
function tipInit(): HTMLDivElement {
  if (tipEl) return tipEl;
  tipEl = document.createElement("div");
  tipEl.className = "tip";
  document.body.appendChild(tipEl);
  return tipEl;
}

export function attachHover(el: SVGElement, text: string): void {
  el.style.cursor = "pointer";
  el.addEventListener("mousemove", (e) => {
    const t = tipInit();
    t.textContent = text;
    t.style.left = `${(e as MouseEvent).clientX + 12}px`;
    t.style.top = `${(e as MouseEvent).clientY + 12}px`;
    t.classList.add("show");
  });
  el.addEventListener("mouseleave", () => tipInit().classList.remove("show"));
}

// Muted, print-friendly categorical palette.
export const PALETTE = [
  "#111418", "#1db954", "#3b6fd6", "#d94f4f",
  "#c47a00", "#7a4ed2", "#108080", "#8a8578",
  "#5e81ac", "#b48ead", "#a3be8c", "#d08770",
];
export const C_ACCENT = "#1db954";
export const C_INK = "#111418";
export const C_MUTED = "#6b7380";
export const C_WARN = "#d94f4f";
export const C_RULE = "#e6e6e1";
export const C_GRID = "#ededea";

export function seqGreen(t: number): string {
  // 0..1 → light→green
  const a = Math.max(0, Math.min(1, t));
  return `rgba(29, 185, 84, ${0.06 + a * 0.9})`;
}
export function seqInk(t: number): string {
  const a = Math.max(0, Math.min(1, t));
  return `rgba(17, 20, 24, ${0.05 + a * 0.85})`;
}

export function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

export function formatThousands(n: number): string {
  return n.toLocaleString("de-DE");
}
