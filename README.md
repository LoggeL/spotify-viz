# spotify-viz

Hand-drawn Visualisierungen deiner persönlichen Spotify-Hörgeschichte.
Liest den **Extended Streaming History**-Export (aus Spotify → Privacy → Download your data),
aggregiert lokal in eine kleine `data.json` und rendert mit [rough.js](https://roughjs.com)
in einer Paper-CSS-artigen Ästhetik.

Kein OAuth, kein Server, kein Tracking — alles lokal.

## Was drin ist (14 Visualisierungen)

| Viz | Was es zeigt |
|---|---|
| Top Artists / Tracks | klassische repeat-king Listen |
| Wochen-Uhr | 7×24 heatmap aus ms gehört |
| 24h-Kreis | polar-clock, wann am tag du hörst |
| Jahr × Monat | hörintensität pro kalendermonat |
| Jahres-Kalender | GitHub-style grid über alle jahre |
| Plattformen im Wandel | stacked bars Android/iOS/Windows/… pro jahr |
| Shuffle vs. Intentional | donut aus `shuffle`-flag |
| Skip-Raten | welche artists du am öftesten wegdrückst |
| Warum Tracks enden | `reason_end`-distribution |
| Session-Längen | histogram zusammenhängender hör-bursts |
| Artist-Loyalität | pro top-artist aktive monate als stripe |
| Wann sie dazu kamen | debut-timeline der top-25 artists |
| Von wo aus gehört | `conn_country`-counts mit flaggen |

## Setup

```bash
# 1. Spotify-Datenexport anfordern: https://www.spotify.com/account/privacy/
#    → "Extended streaming history" ankreuzen, ~5 tage warten, ZIP runterladen
# 2. ZIP entpacken nach data/raw/Spotify\ Extended\ Streaming\ History/
#    (so dass data/raw/Spotify Extended Streaming History/Streaming_History_Audio_*.json existiert)

npm install
npm run preprocess   # liest raw, schreibt public/data.json (~130 KB)
npm run dev          # öffnet http://127.0.0.1:5180
```

## Bauen für prod

```bash
npm run build        # statische dateien in dist/
npm run preview
```

`public/data.json` muss dafür existieren — `npm run preprocess` vorher laufen lassen.

## Struktur

```
scripts/preprocess.mjs   # Node: raw JSONs → kompakte data.json
src/lib/data.ts          # types + loader
src/lib/util.ts          # rough.js helpers, tooltip, palette
src/viz/*.ts             # je viz ein modul
src/main.ts              # app shell + tab routing
src/styles.css           # paper aesthetic, hand-drawn feel
```

## Datenmodell (public/data.json)

Alles vorab aggregiert — keine einzelnen Plays im Bundle. Felder:
`totals`, `topArtists`, `topTracks`, `clock` (7×24 ms), `yearMonth`, `day`,
`platformStack`, `shuffle`, `skipRate`, `loyalty`, `countries`, `sessions`,
`firstPlays`, `endReasons`.

Ein "play" zählt ab **30 000 ms** (Spotifys eigene Regel).
