import { mkSvg, text, path, attachHover, C_INK, C_MUTED } from "../lib/util";
import { fmtNum, fmtHours, type DataBundle } from "../lib/data";

interface Category {
  name: string;
  color: string;
  // test by regex: first match wins
  test: RegExp;
}

// Ordered by priority — narrower categories first
const CATEGORIES: Category[] = [
  { name: "METAL",       color: "#111418", test: /\b(metal|core|doom|grind|sludge|djent)\b/ },
  { name: "PUNK",        color: "#d94f4f", test: /\b(punk|emo|hardcore|screamo|post-hardcore|ska)\b/ },
  { name: "ROCK",        color: "#c47a00", test: /\b(rock|rockabilly|grunge|psychedelic)\b/ },
  { name: "HIP HOP/RAP", color: "#7a4ed2", test: /\b(hip hop|rap|trap|drill)\b/ },
  { name: "ELECTRONIC",  color: "#3b6fd6", test: /\b(edm|house|techno|trance|step|bass|electro|dub|drum|breakbeat|synthwave|chillstep|future|glitch|idm|hardstyle|gabber|big room|hardcore techno|industrial)\b/ },
  { name: "POP",         color: "#1db954", test: /\b(pop|schlager|k-pop|j-pop|indie pop|dance pop|europop)\b/ },
  { name: "FOLK/COUNTRY",color: "#108080", test: /\b(folk|acoustic|singer-songwriter|country|bluegrass|americana|medieval|sea shanty|sea shanties|celtic)\b/ },
  { name: "INDIE/ALT",   color: "#5e81ac", test: /\b(indie|alternative|alt |shoegaze|dream pop)\b/ },
  { name: "JAZZ/SOUL",   color: "#b48ead", test: /\b(jazz|soul|funk|r&b|rnb|blues|gospel|motown)\b/ },
  { name: "CLASSICAL",   color: "#8a8578", test: /\b(classical|baroque|orchestral|opera|soundtrack|score|film)\b/ },
  { name: "LATIN/WORLD", color: "#d08770", test: /\b(latin|reggaeton|reggae|dancehall|afro|samba|bossa|cumbia|tango|flamenco|ranchera|mariachi|kwaito)\b/ },
  { name: "OTHER",       color: "#a3a3a0", test: /.*/ },
];

function categorize(g: string): Category {
  for (const c of CATEGORIES) if (c.test.test(g)) return c;
  return CATEGORIES[CATEGORIES.length - 1];
}

function arcPath(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number): string {
  // a0, a1 in radians. Draw annular sector. a0 < a1.
  const x0o = cx + r1 * Math.cos(a0), y0o = cy + r1 * Math.sin(a0);
  const x1o = cx + r1 * Math.cos(a1), y1o = cy + r1 * Math.sin(a1);
  const x1i = cx + r0 * Math.cos(a1), y1i = cy + r0 * Math.sin(a1);
  const x0i = cx + r0 * Math.cos(a0), y0i = cy + r0 * Math.sin(a0);
  const large = (a1 - a0) > Math.PI ? 1 : 0;
  return `M ${x0o} ${y0o} A ${r1} ${r1} 0 ${large} 1 ${x1o} ${y1o} L ${x1i} ${y1i} A ${r0} ${r0} 0 ${large} 0 ${x0i} ${y0i} Z`;
}

export function renderGenreSunburst(data: DataBundle): SVGSVGElement | HTMLElement {
  if (!data.genres) {
    const p = document.createElement("p");
    p.className = "status"; p.textContent = "Keine Genre-Daten.";
    return p;
  }

  // bucket the top genres
  const buckets = new Map<string, { cat: Category; plays: number; ms: number; items: { g: string; plays: number; ms: number }[] }>();
  for (const g of data.genres.top) {
    const cat = categorize(g.g);
    if (!buckets.has(cat.name)) buckets.set(cat.name, { cat, plays: 0, ms: 0, items: [] });
    const b = buckets.get(cat.name)!;
    b.plays += g.plays; b.ms += g.ms;
    b.items.push({ g: g.g, plays: g.plays, ms: g.ms });
  }
  // drop empty, sort categories by plays desc for a pleasing layout
  const cats = [...buckets.values()]
    .filter((b) => b.plays > 0)
    .sort((a, b) => b.plays - a.plays);
  for (const c of cats) c.items.sort((a, b) => b.plays - a.plays);
  const total = cats.reduce((s, c) => s + c.plays, 0) || 1;

  const W = 900;
  const H = 520;
  const svg = mkSvg(W, H);
  const cx = 260;
  const cy = H / 2;
  const rInner = 52;
  const rMid = 150;
  const rOuter = 230;
  const start = -Math.PI / 2;

  // draw category ring
  let a = start;
  for (const c of cats) {
    const span = (c.plays / total) * Math.PI * 2;
    const a0 = a, a1 = a + span;
    const p = path(arcPath(cx, cy, rInner, rMid, a0, a1), { fill: c.cat.color, opacity: 0.92 });
    attachHover(p, `${c.cat.name}  ${fmtNum(c.plays)} plays · ${fmtHours(c.ms)} · ${c.items.length} genres`);
    svg.appendChild(p);
    // category label along center of arc
    const mid = (a0 + a1) / 2;
    const frac = span / (Math.PI * 2);
    if (frac > 0.035) {
      const tx = cx + ((rInner + rMid) / 2) * Math.cos(mid);
      const ty = cy + ((rInner + rMid) / 2) * Math.sin(mid);
      // contrast: white on dark fills
      const dark = ["#111418", "#3b6fd6", "#7a4ed2", "#108080"].includes(c.cat.color);
      svg.appendChild(text(tx, ty + 3, c.cat.name, {
        "text-anchor": "middle", "font-size": 10, "font-weight": 700,
        fill: dark ? "#fff" : C_INK, class: "mono",
      }));
      svg.appendChild(text(tx, ty + 15, `${(frac * 100).toFixed(0)}%`, {
        "text-anchor": "middle", "font-size": 9,
        fill: dark ? "#ffffffcc" : C_MUTED, class: "num",
      }));
    }
    a = a1;
  }

  // outer ring: individual genres
  a = start;
  for (const c of cats) {
    const span = (c.plays / total) * Math.PI * 2;
    let ga = a;
    for (const it of c.items) {
      const gs = (it.plays / c.plays) * span;
      const ga0 = ga, ga1 = ga + gs;
      const seg = path(arcPath(cx, cy, rMid + 3, rOuter, ga0, ga1), {
        fill: c.cat.color, opacity: 0.35, stroke: "#fff", "stroke-width": 0.6,
      });
      attachHover(seg, `${it.g}  ${fmtNum(it.plays)} plays · ${fmtHours(it.ms)}  (${c.cat.name})`);
      svg.appendChild(seg);
      // tiny label for big slices
      const frac = gs / (Math.PI * 2);
      if (frac > 0.012) {
        const mid = (ga0 + ga1) / 2;
        const tr = rOuter + 8;
        const tx = cx + tr * Math.cos(mid);
        const ty = cy + tr * Math.sin(mid);
        const right = Math.cos(mid) > 0;
        // tick
        svg.appendChild(path(`M ${cx + (rOuter - 1) * Math.cos(mid)} ${cy + (rOuter - 1) * Math.sin(mid)} L ${tx} ${ty}`, {
          stroke: "#c5c4bc", "stroke-width": 0.6,
        }));
        svg.appendChild(text(tx + (right ? 3 : -3), ty + 3, it.g.length > 20 ? it.g.slice(0, 19) + "…" : it.g, {
          "text-anchor": right ? "start" : "end", "font-size": 9, fill: C_INK,
        }));
      }
      ga = ga1;
    }
    a += span;
  }

  // center stats
  svg.appendChild(text(cx, cy - 6, fmtNum(total), {
    "text-anchor": "middle", "font-size": 22, "font-weight": 700, class: "num",
  }));
  svg.appendChild(text(cx, cy + 10, "top-genre plays", {
    "text-anchor": "middle", "font-size": 10, fill: C_MUTED, class: "axis-label",
  }));
  svg.appendChild(text(cx, cy + 24, `${cats.length} kategorien`, {
    "text-anchor": "middle", "font-size": 9, fill: C_MUTED, class: "mono",
  }));

  // legend: category list on the right
  const lx = 560;
  const ly0 = 70;
  svg.appendChild(text(lx, ly0 - 14, "CATEGORIES", { class: "axis-label" }));
  cats.forEach((c, i) => {
    const y = ly0 + i * 32;
    svg.appendChild(path(`M ${lx} ${y - 5} h 8 v 10 h -8 z`, { fill: c.cat.color }));
    svg.appendChild(text(lx + 14, y + 3, c.cat.name, { "font-size": 11, "font-weight": 600, fill: C_INK, class: "mono" }));
    const pct = ((c.plays / total) * 100).toFixed(1);
    svg.appendChild(text(lx + 14, y + 16, `${fmtNum(c.plays)} plays · ${pct}% · ${c.items.length} genres`, {
      "font-size": 10, fill: C_MUTED, class: "num",
    }));
  });

  return svg;
}
