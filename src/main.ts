import "./styles.css";
import { loadData, fmtHours, fmtNum, type DataBundle } from "./lib/data";
import { renderRecords } from "./viz/records";
import { renderClock } from "./viz/clock";
import { renderYearMonth } from "./viz/year-month";
import { renderTopArtists } from "./viz/top-artists";
import { renderTopTracks } from "./viz/top-tracks";
import { renderTopAlbums } from "./viz/top-albums";
import { renderPlatformStack } from "./viz/platform-stack";
import { renderSkipRate } from "./viz/skip-rate";
import { renderShuffleDonut } from "./viz/shuffle-donut";
import { renderLoyalty } from "./viz/loyalty";
import { renderCalendar } from "./viz/calendar";
import { renderSessions } from "./viz/sessions";
import { renderSessionByHour } from "./viz/session-by-hour";
import { renderFirstPlays } from "./viz/first-plays";
import { renderCountries } from "./viz/countries";
import { renderEndReasons } from "./viz/end-reasons";
import { renderClockSpiral } from "./viz/clock-spiral";
import { renderHoursPerYear } from "./viz/hours-per-year";
import { renderWeekday } from "./viz/weekday";
import { renderCumulative } from "./viz/cumulative";
import { renderDiscovery } from "./viz/discovery";
import { renderLorenz } from "./viz/lorenz";
import { renderDayHist } from "./viz/day-hist";
import { renderYearHours } from "./viz/year-hours";

interface VizDef {
  id: string;
  title: string;
  subtitle: string;
  render: (data: DataBundle) => SVGSVGElement | HTMLElement;
}

const VIZ: VizDef[] = [
  { id: "records", title: "Records & Extremes", subtitle: "die crazy stats aus fast 9 jahren hören", render: renderRecords },
  { id: "hours-year", title: "Hours per Year", subtitle: "jahres-totals in stunden", render: renderHoursPerYear },
  { id: "cumulative", title: "Lifetime Cumulative", subtitle: "aufsummierte hör-stunden über die zeit", render: renderCumulative },
  { id: "top-artists", title: "Top Artists", subtitle: "ranked by full plays (≥30s)", render: renderTopArtists },
  { id: "top-albums", title: "Top Albums", subtitle: "ranked by hours listened", render: renderTopAlbums },
  { id: "top-tracks", title: "Top Tracks", subtitle: "most repeated tracks overall", render: renderTopTracks },
  { id: "lorenz", title: "Artist Concentration", subtitle: "wie konzentriert hörst du? (lorenz curve)", render: renderLorenz },
  { id: "discovery", title: "Discovery Rate", subtitle: "neue artists pro monat — erstes mal gehört", render: renderDiscovery },
  { id: "weekday", title: "Weekday Fingerprint", subtitle: "gesamt-stunden pro wochentag", render: renderWeekday },
  { id: "clock", title: "Listening Clock", subtitle: "hour × weekday heatmap", render: renderClock },
  { id: "clock-spiral", title: "24h Distribution", subtitle: "stunden summiert über alle wochentage", render: renderClockSpiral },
  { id: "year-hours", title: "Year × Hour", subtitle: "tageszeit-verteilung je jahr", render: renderYearHours },
  { id: "year-month", title: "Year × Month", subtitle: "hours listened per calendar month", render: renderYearMonth },
  { id: "calendar", title: "Daily Calendar", subtitle: "GitHub-style activity grid", render: renderCalendar },
  { id: "day-hist", title: "Day-Length Distribution", subtitle: "wie viele tage mit wie viel hörzeit", render: renderDayHist },
  { id: "platform", title: "Platforms Over Time", subtitle: "plays + hours per device class, per year", render: renderPlatformStack },
  { id: "shuffle", title: "Shuffle vs Intentional", subtitle: "share of plays started via shuffle", render: renderShuffleDonut },
  { id: "skip", title: "Skip Rates", subtitle: "artists ranked by skip frequency (min 25 exposures)", render: renderSkipRate },
  { id: "end-reasons", title: "Track End Reasons", subtitle: "how playback terminated", render: renderEndReasons },
  { id: "sessions", title: "Session Lengths", subtitle: "distribution of contiguous listening bursts", render: renderSessions },
  { id: "session-hour", title: "Session Duration by Hour", subtitle: "avg session length je start-stunde", render: renderSessionByHour },
  { id: "loyalty", title: "Artist Loyalty", subtitle: "active months per top artist", render: renderLoyalty },
  { id: "first-plays", title: "First-Play Timeline", subtitle: "when each top-25 artist entered rotation", render: renderFirstPlays },
  { id: "countries", title: "Geographic Origin", subtitle: "plays by connection country", render: renderCountries },
];

async function main() {
  const app = document.querySelector<HTMLDivElement>("#app")!;

  app.innerHTML = `
    <header>
      <h1>Spotify Listening Report</h1>
      <p class="lead" id="span">loading data…</p>
      <div class="stats" id="stats"></div>
    </header>
    <nav class="tabs" id="tabs"></nav>
    <div id="stage"></div>
    <footer>
      local-only · processed from Spotify Extended Streaming History
    </footer>
  `;

  let data: DataBundle;
  try {
    data = await loadData();
  } catch (e) {
    app.querySelector("#stage")!.innerHTML =
      `<div class="status">⚠ ${(e as Error).message} — run <code>npm run preprocess</code></div>`;
    return;
  }

  const t = data.totals;
  const span = app.querySelector<HTMLParagraphElement>("#span")!;
  span.textContent = `${t.firstPlay.slice(0, 10)} → ${t.lastPlay.slice(0, 10)}`;

  const stats = app.querySelector<HTMLDivElement>("#stats")!;
  const cells = [
    { k: "Plays", v: fmtNum(t.totalPlays) },
    { k: "Hours", v: fmtHours(t.totalMs) },
    { k: "Artists", v: fmtNum(t.uniqueArtists) },
    { k: "Albums", v: fmtNum(t.uniqueAlbums) },
    { k: "Tracks", v: fmtNum(t.uniqueTracks) },
    { k: "Years", v: String(t.years.length) },
    { k: "Platforms", v: String(t.platforms.length) },
  ];
  for (const c of cells) {
    const el = document.createElement("div");
    el.className = "stat";
    el.innerHTML = `<div class="k">${c.k}</div><div class="v">${c.v}</div>`;
    stats.appendChild(el);
  }

  const tabs = app.querySelector<HTMLElement>("#tabs")!;
  const stage = app.querySelector<HTMLDivElement>("#stage")!;

  const allBtn = document.createElement("button");
  allBtn.textContent = "All";
  allBtn.className = "all active";
  allBtn.addEventListener("click", () => render("all"));
  tabs.appendChild(allBtn);

  VIZ.forEach((v) => {
    const btn = document.createElement("button");
    btn.textContent = v.title;
    btn.dataset.id = v.id;
    btn.addEventListener("click", () => render(v.id));
    tabs.appendChild(btn);
  });

  const printBtn = document.createElement("button");
  printBtn.textContent = "Print / PDF";
  printBtn.className = "print-btn";
  printBtn.addEventListener("click", async () => {
    render("all");
    // wait for layout + flag images
    await new Promise((r) => setTimeout(r, 400));
    window.print();
  });
  tabs.appendChild(printBtn);

  function render(id: string) {
    stage.innerHTML = "";
    tabs.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
    if (id === "all") allBtn.classList.add("active");
    else tabs.querySelector<HTMLButtonElement>(`button[data-id="${id}"]`)?.classList.add("active");

    const list = id === "all" ? VIZ : VIZ.filter((v) => v.id === id);
    // print-page-break anchors: force a new page before these sections
    const BREAK_BEFORE = new Set([
      "hours-year", "top-artists", "lorenz", "weekday",
      "year-month", "platform", "sessions", "first-plays",
    ]);
    for (const v of list) {
      const card = document.createElement("section");
      card.className = "viz-card";
      if (id === "all" && BREAK_BEFORE.has(v.id)) card.dataset.printBreak = "before";
      const head = document.createElement("header");
      head.innerHTML = `<h2>${v.title}</h2><p class="subtitle">${v.subtitle}</p>`;
      card.appendChild(head);
      try {
        card.appendChild(v.render(data));
      } catch (err) {
        const p = document.createElement("p");
        p.className = "status";
        p.textContent = `viz '${v.id}' failed: ${(err as Error).message}`;
        card.appendChild(p);
      }
      stage.appendChild(card);
    }
  }

  render("all");
}

main();
