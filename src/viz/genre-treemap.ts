import { mkSvg, rect, text, path, attachHover } from "../lib/util";
import { fmtNum, fmtHours, type DataBundle } from "../lib/data";

// Finviz-style market-map. Rectangles sized by plays, grouped + colored by
// super-category. Shows the overall distribution of the listening library.

interface Category { name: string; color: string; test: RegExp; }

// order = priority (narrower first)
const CATEGORIES: Category[] = [
  { name: "METAL",        color: "#111418", test: /\b(metal|core|doom|grind|sludge|djent)\b/ },
  { name: "PUNK",         color: "#d94f4f", test: /\b(punk|emo|hardcore|screamo|post-hardcore|ska)\b/ },
  { name: "ROCK",         color: "#c47a00", test: /\b(rock|rockabilly|grunge|psychedelic)\b/ },
  { name: "HIP HOP / RAP",color: "#7a4ed2", test: /\b(hip hop|rap|trap|drill)\b/ },
  { name: "ELECTRONIC",   color: "#3b6fd6", test: /\b(edm|house|techno|trance|step|bass|electro|dub|drum|breakbeat|synthwave|chillstep|future|glitch|idm|hardstyle|gabber|big room|hardcore techno|industrial)\b/ },
  { name: "POP",          color: "#1db954", test: /\b(pop|schlager|k-pop|j-pop|indie pop|dance pop|europop)\b/ },
  { name: "FOLK / COUNTRY",color: "#108080",test: /\b(folk|acoustic|singer-songwriter|country|bluegrass|americana|medieval|sea shanty|sea shanties|celtic)\b/ },
  { name: "INDIE / ALT",  color: "#5e81ac", test: /\b(indie|alternative|alt |shoegaze|dream pop)\b/ },
  { name: "JAZZ / SOUL",  color: "#b48ead", test: /\b(jazz|soul|funk|r&b|rnb|blues|gospel|motown)\b/ },
  { name: "CLASSICAL",    color: "#8a8578", test: /\b(classical|baroque|orchestral|opera|soundtrack|score|film)\b/ },
  { name: "LATIN / WORLD",color: "#d08770", test: /\b(latin|reggaeton|reggae|dancehall|afro|samba|bossa|cumbia|tango|flamenco|ranchera|mariachi|kwaito)\b/ },
  { name: "OTHER",        color: "#a3a3a0", test: /.*/ },
];

function categorize(g: string): Category {
  const lower = g.toLowerCase();
  for (const c of CATEGORIES) if (c.test.test(lower)) return c;
  return CATEGORIES[CATEGORIES.length - 1];
}

interface Leaf { g: string; value: number; plays: number; ms: number; artists: number; }
interface Node { name: string; color: string; value: number; children: Leaf[]; }
interface Rect { x: number; y: number; w: number; h: number; }

// --- squarified treemap (Bruls / Huijbregts / van Wijk 2000) -------------
function worst(row: number[], side: number, scale: number): number {
  const s = row.reduce((a, b) => a + b, 0) * scale;
  const rmax = Math.max(...row) * scale;
  const rmin = Math.min(...row) * scale;
  return Math.max((side * side * rmax) / (s * s), (s * s) / (side * side * rmin));
}

function layoutRow<T extends { value: number }>(
  row: T[], container: Rect, scale: number, out: { item: T; rect: Rect }[]
): Rect {
  // Standard squarified layout: pack the row along the *shortest* side of the
  // container. Strip thickness is on the long axis; items span the short axis.
  const rowSum = row.reduce((s, r) => s + r.value, 0) * scale;
  const shorter = Math.min(container.w, container.h);
  const thickness = rowSum / shorter;

  if (container.w >= container.h) {
    // short side = height. Strip on LEFT; items stacked vertically.
    let y = container.y;
    for (const r of row) {
      const rh = (r.value * scale) / thickness;
      out.push({ item: r, rect: { x: container.x, y, w: thickness, h: rh } });
      y += rh;
    }
    return { x: container.x + thickness, y: container.y, w: container.w - thickness, h: container.h };
  } else {
    // short side = width. Strip on TOP; items packed horizontally.
    let x = container.x;
    for (const r of row) {
      const rw = (r.value * scale) / thickness;
      out.push({ item: r, rect: { x, y: container.y, w: rw, h: thickness } });
      x += rw;
    }
    return { x: container.x, y: container.y + thickness, w: container.w, h: container.h - thickness };
  }
}

function squarify<T extends { value: number }>(items: T[], container: Rect): { item: T; rect: Rect }[] {
  const totalValue = items.reduce((s, l) => s + l.value, 0);
  const totalArea = container.w * container.h;
  if (totalValue <= 0 || totalArea <= 0) return [];
  const scale = totalArea / totalValue;
  const out: { item: T; rect: Rect }[] = [];
  const remaining = items.slice().sort((a, b) => b.value - a.value);
  let cur = { ...container };
  let row: T[] = [];
  while (remaining.length) {
    const shortSide = Math.min(cur.w, cur.h);
    if (shortSide <= 0) break;
    const next = remaining[0];
    const currentWorst = row.length ? worst(row.map((r) => r.value), shortSide, scale) : Infinity;
    const nextWorst = worst([...row.map((r) => r.value), next.value], shortSide, scale);
    if (row.length === 0 || nextWorst <= currentWorst) {
      row.push(next);
      remaining.shift();
    } else {
      cur = layoutRow(row, cur, scale, out);
      row = [];
    }
  }
  if (row.length) layoutRow(row, cur, scale, out);
  return out;
}

function tint(hex: string, k: number): string {
  // lighten hex toward white by k (0..1)
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const m = (c: number) => Math.round(c + (255 - c) * k);
  return "#" + [m(r), m(g), m(b)].map((v) => v.toString(16).padStart(2, "0")).join("");
}

function textColor(bg: string): string {
  const r = parseInt(bg.slice(1, 3), 16), g = parseInt(bg.slice(3, 5), 16), b = parseInt(bg.slice(5, 7), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.62 ? "#0a0c0f" : "#ffffff";
}

export function renderGenreTreemap(data: DataBundle): SVGSVGElement | HTMLElement {
  if (!data.genres) {
    const p = document.createElement("p");
    p.className = "status"; p.textContent = "Keine Genre-Daten — run npm run enrich-genres.";
    return p;
  }

  // group genres into categories
  const byCat = new Map<string, Node>();
  for (const g of data.genres.top) {
    if (g.plays <= 0) continue;
    const cat = categorize(g.g);
    if (!byCat.has(cat.name)) byCat.set(cat.name, { name: cat.name, color: cat.color, value: 0, children: [] });
    const n = byCat.get(cat.name)!;
    n.value += g.plays;
    n.children.push({ g: g.g, value: g.plays, plays: g.plays, ms: g.ms, artists: g.artists });
  }
  const nodes = [...byCat.values()].sort((a, b) => b.value - a.value);
  const totalPlays = nodes.reduce((s, n) => s + n.value, 0) || 1;

  const W = 900;
  const H = 560;
  const headerH = 48;
  const legendH = 30;
  const frame: Rect = { x: 0, y: headerH, w: W, h: H - headerH - legendH };
  const svg = mkSvg(W, H);

  // header
  svg.appendChild(text(16, 22, "MARKET MAP · fläche = plays · blöcke + farbe = genre-kategorie", {
    class: "axis-label",
  }));
  svg.appendChild(text(16, 38, `${nodes.length} kategorien · ${data.genres.top.length} genres · ${fmtNum(totalPlays)} plays`, {
    "font-size": 11, class: "mono", fill: "#6b7380",
  }));

  // outer layout: categories
  const catLayouts = squarify(nodes, frame);

  for (const { item: cat, rect: cr } of catLayouts) {
    // draw category backdrop (thick border, deep tint for contrast)
    svg.appendChild(rect(cr.x, cr.y, cr.w, cr.h, { fill: cat.color, opacity: 0.22 }));

    // inner layout: genres in this category
    const pad = 3;
    const labelH = cr.h >= 64 && cr.w >= 84 ? 14 : 0; // reserve header row for category name
    const inner: Rect = {
      x: cr.x + pad,
      y: cr.y + pad + labelH,
      w: Math.max(0, cr.w - pad * 2),
      h: Math.max(0, cr.h - pad * 2 - labelH),
    };
    const genreLayouts = squarify(cat.children, inner);

    for (const { item: leaf, rect: r } of genreLayouts) {
      // scale tint by leaf share within its category so dominant genres pop
      const shareInCat = leaf.plays / cat.value;
      const tintAmt = 0.55 - Math.min(0.45, shareInCat * 0.7);
      const fill = tint(cat.color, tintAmt);
      const fg = textColor(fill);
      const tile = rect(r.x, r.y, Math.max(0, r.w - 1), Math.max(0, r.h - 1), {
        fill, stroke: "#ffffff", "stroke-width": 0.8,
      });
      const share = (leaf.plays / totalPlays) * 100;
      attachHover(tile,
        `${leaf.g}  ${fmtNum(leaf.plays)} plays · ${fmtHours(leaf.ms)} · ${leaf.artists} artists · ${share.toFixed(1)}% aller top-genre plays`
      );
      svg.appendChild(tile);

      if (r.w >= 64 && r.h >= 30) {
        const nameFont = Math.max(10, Math.min(18, Math.sqrt(r.w * r.h) / 10));
        const nm = leaf.g.length > 24 ? leaf.g.slice(0, 23) + "…" : leaf.g;
        const cx = r.x + r.w / 2;
        const cy = r.y + r.h / 2;
        svg.appendChild(text(cx, cy - 1, nm, {
          "text-anchor": "middle", "font-size": nameFont.toFixed(1),
          "font-weight": 700, fill: fg,
        }));
        if (r.h >= 44) {
          svg.appendChild(text(cx, cy + nameFont * 0.92, fmtNum(leaf.plays), {
            "text-anchor": "middle", "font-size": Math.max(9, nameFont * 0.6).toFixed(1),
            fill: fg, opacity: 0.8, class: "num",
          }));
        }
      } else if (r.w >= 38 && r.h >= 16) {
        svg.appendChild(text(r.x + r.w / 2, r.y + r.h / 2 + 3,
          leaf.g.length > 10 ? leaf.g.slice(0, 9) + "…" : leaf.g, {
          "text-anchor": "middle", "font-size": 9, "font-weight": 600, fill: fg,
        }));
      }
    }

    // category frame + header
    svg.appendChild(path(
      `M ${cr.x + 0.5} ${cr.y + 0.5} h ${cr.w - 1} v ${cr.h - 1} h ${-(cr.w - 1)} Z`,
      { fill: "none", stroke: cat.color, "stroke-width": 2, opacity: 0.85 }
    ));
    if (labelH) {
      const pct = ((cat.value / totalPlays) * 100).toFixed(1);
      svg.appendChild(text(cr.x + 8, cr.y + 13, cat.name, {
        "font-size": 11, "font-weight": 700, fill: cat.color, class: "mono",
      }));
      svg.appendChild(text(cr.x + cr.w - 8, cr.y + 13, `${fmtNum(cat.value)} · ${pct}%`, {
        "text-anchor": "end", "font-size": 10, fill: cat.color, class: "num", opacity: 0.9,
      }));
    }
  }

  // bottom legend: category swatches (sorted by share)
  const ly = H - legendH + 16;
  let lx = 16;
  for (const n of nodes) {
    const pct = (n.value / totalPlays) * 100;
    svg.appendChild(rect(lx, ly - 8, 10, 10, { fill: n.color }));
    const label = `${n.name} ${pct.toFixed(1)}%`;
    svg.appendChild(text(lx + 14, ly, label, {
      "font-size": 10, fill: "#111418", class: "mono",
    }));
    lx += label.length * 5.8 + 26;
    if (lx > W - 120) break;
  }

  return svg;
}
