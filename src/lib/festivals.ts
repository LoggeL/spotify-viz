export type FestivalId = "rock-am-ring-2026" | "southside-2026" | "stagetopia-2026" | "highfield-2026";

export type Act = {
  id: string;
  festivalId: FestivalId;
  day: string;
  date: string;
  stage: string;
  artist: string;
  start?: string;
  end?: string;
  source: "official-timetable" | "official-lineup";
};

export type Festival = {
  id: FestivalId;
  name: string;
  place: string;
  dates: string;
  note: string;
  sourceUrl: string;
  stageOrder: string[];
};

export const festivals: Festival[] = [
  {
    id: "rock-am-ring-2026",
    name: "Rock am Ring",
    place: "Nürburgring",
    dates: "5.-7. Juni 2026",
    note: "Offizielle Zeiten von rock-am-ring.com, Stand 05.06.2026.",
    sourceUrl: "https://www.rock-am-ring.com/timetable",
    stageOrder: ["Utopia Stage", "Mandora Stage", "Orbit Stage"],
  },
  {
    id: "southside-2026",
    name: "Southside",
    place: "Neuhausen ob Eck",
    dates: "18.-21. Juni 2026",
    note: "Offizielle Zeiten aus southside.de, Stand 28.05.2026.",
    sourceUrl: "https://southside.de/line-up/",
    stageOrder: ["Green Stage", "Blue Stage", "Red Stage", "White Stage", "Electric Wave X White Stage", "TBA"],
  },
  {
    id: "stagetopia-2026",
    name: "Stagetopia",
    place: "Universität Saarbrücken",
    dates: "13. Juni 2026",
    note: "Offizielle Zeiten von stagetopia.de, Stand 01.06.2026.",
    sourceUrl: "https://stagetopia.de/",
    stageOrder: ["Hip Hop", "Rock", "Electro", "Trance", "Club"],
  },
  {
    id: "highfield-2026",
    name: "Highfield",
    place: "Störmthaler See, Großpösna",
    dates: "13.-16. August 2026",
    note: "Offizielles Line-up nach Tagen; Uhrzeiten waren am 07.06.2026 noch nicht veröffentlicht.",
    sourceUrl: "https://highfield.de/line-up/",
    stageOrder: ["Warm-Up Party", "Konzert", "Electric Beach"],
  },
];

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeArtist(value: string) {
  return slugify(value).replace(/^the-/, "");
}

function southsideTimeKey(date: string, artist: string) {
  return `${date}|${normalizeArtist(artist)}`;
}

const rarRows: [string, string, string, string, string, string, string][] = [
  ["fri", "Freitag", "05.06.2026", "Utopia Stage", "Mehnersmoos", "14:55", "15:50"],
  ["fri", "Freitag", "05.06.2026", "Utopia Stage", "Bush", "16:20", "17:20"],
  ["fri", "Freitag", "05.06.2026", "Utopia Stage", "The Hives", "17:50", "18:50"],
  ["fri", "Freitag", "05.06.2026", "Utopia Stage", "Architects", "19:20", "20:20"],
  ["fri", "Freitag", "05.06.2026", "Utopia Stage", "Papa Roach", "21:00", "22:15"],
  ["fri", "Freitag", "05.06.2026", "Utopia Stage", "Linkin Park", "23:00", "00:30"],
  ["fri", "Freitag", "05.06.2026", "Mandora Stage", "Loathe", "14:05", "14:50"],
  ["fri", "Freitag", "05.06.2026", "Mandora Stage", "We Came As Romans", "15:20", "16:05"],
  ["fri", "Freitag", "05.06.2026", "Mandora Stage", "Mastodon", "16:35", "17:25"],
  ["fri", "Freitag", "05.06.2026", "Mandora Stage", "The Plot In You", "17:55", "18:55"],
  ["fri", "Freitag", "05.06.2026", "Mandora Stage", "Within Temptation", "19:25", "20:25"],
  ["fri", "Freitag", "05.06.2026", "Mandora Stage", "Trivium", "20:55", "22:05"],
  ["fri", "Freitag", "05.06.2026", "Mandora Stage", "Babymetal", "22:45", "00:00"],
  ["fri", "Freitag", "05.06.2026", "Mandora Stage", "Limp Bizkit", "01:00", "02:15"],
  ["fri", "Freitag", "05.06.2026", "Orbit Stage", "Slay Squad", "14:55", "15:35"],
  ["fri", "Freitag", "05.06.2026", "Orbit Stage", "Ankor", "16:00", "16:40"],
  ["fri", "Freitag", "05.06.2026", "Orbit Stage", "Magnolia Park", "17:05", "17:45"],
  ["fri", "Freitag", "05.06.2026", "Orbit Stage", "TX2", "18:10", "18:50"],
  ["fri", "Freitag", "05.06.2026", "Orbit Stage", "Don Broco", "19:15", "20:00"],
  ["fri", "Freitag", "05.06.2026", "Orbit Stage", "DRAIN", "20:25", "21:10"],
  ["fri", "Freitag", "05.06.2026", "Orbit Stage", "Malevolence", "21:35", "22:25"],
  ["fri", "Freitag", "05.06.2026", "Orbit Stage", "The Funeral Portrait", "22:50", "23:50"],
  ["fri", "Freitag", "05.06.2026", "Orbit Stage", "Danko Jones", "00:20", "01:20"],
  ["fri", "Freitag", "05.06.2026", "Orbit Stage", "The Butcher Sisters", "01:50", "03:00"],
  ["sat", "Samstag", "06.06.2026", "Utopia Stage", "Ecca Vandal", "14:50", "15:35"],
  ["sat", "Samstag", "06.06.2026", "Utopia Stage", "The Pretty Reckless", "16:05", "17:05"],
  ["sat", "Samstag", "06.06.2026", "Utopia Stage", "Tom Morello", "17:35", "18:35"],
  ["sat", "Samstag", "06.06.2026", "Utopia Stage", "Three Days Grace", "19:05", "20:20"],
  ["sat", "Samstag", "06.06.2026", "Utopia Stage", "Electric Callboy", "21:00", "22:30"],
  ["sat", "Samstag", "06.06.2026", "Utopia Stage", "Volbeat", "23:15", "01:00"],
  ["sat", "Samstag", "06.06.2026", "Mandora Stage", "Paleface Swiss", "15:15", "15:50"],
  ["sat", "Samstag", "06.06.2026", "Mandora Stage", "Bilmuri", "16:10", "16:55"],
  ["sat", "Samstag", "06.06.2026", "Mandora Stage", "Bury Tomorrow", "17:20", "18:15"],
  ["sat", "Samstag", "06.06.2026", "Mandora Stage", "Landmvrks", "18:45", "19:45"],
  ["sat", "Samstag", "06.06.2026", "Mandora Stage", "Ice Nine Kills", "20:15", "21:25"],
  ["sat", "Samstag", "06.06.2026", "Mandora Stage", "Marteria", "22:05", "23:20"],
  ["sat", "Samstag", "06.06.2026", "Mandora Stage", "Bad Omens", "00:30", "02:00"],
  ["sat", "Samstag", "06.06.2026", "Orbit Stage", "Max Grimm", "14:20", "15:00"],
  ["sat", "Samstag", "06.06.2026", "Orbit Stage", "letlive.", "15:25", "16:05"],
  ["sat", "Samstag", "06.06.2026", "Orbit Stage", "Anna Grey", "16:30", "17:10"],
  ["sat", "Samstag", "06.06.2026", "Orbit Stage", "The Subways", "17:35", "18:15"],
  ["sat", "Samstag", "06.06.2026", "Orbit Stage", "Wargasm", "18:40", "19:20"],
  ["sat", "Samstag", "06.06.2026", "Orbit Stage", "Dying Wish", "19:45", "20:30"],
  ["sat", "Samstag", "06.06.2026", "Orbit Stage", "High Vis", "20:55", "21:40"],
  ["sat", "Samstag", "06.06.2026", "Orbit Stage", "Thornhill", "22:05", "22:55"],
  ["sat", "Samstag", "06.06.2026", "Orbit Stage", "Basement", "23:20", "00:05"],
  ["sat", "Samstag", "06.06.2026", "Orbit Stage", "Palaye Royale", "00:30", "01:30"],
  ["sat", "Samstag", "06.06.2026", "Orbit Stage", "H-Blockx", "02:00", "03:00"],
  ["sun", "Sonntag", "07.06.2026", "Utopia Stage", "Bad Nerves", "12:55", "13:40"],
  ["sun", "Sonntag", "07.06.2026", "Utopia Stage", "Black Veil Brides", "14:10", "15:05"],
  ["sun", "Sonntag", "07.06.2026", "Utopia Stage", "Hollywood Undead", "15:35", "16:35"],
  ["sun", "Sonntag", "07.06.2026", "Utopia Stage", "Finch", "17:05", "18:15"],
  ["sun", "Sonntag", "07.06.2026", "Utopia Stage", "The Offspring", "19:00", "20:15"],
  ["sun", "Sonntag", "07.06.2026", "Utopia Stage", "Iron Maiden", "21:00", "23:20"],
  ["sun", "Sonntag", "07.06.2026", "Mandora Stage", "Return to Dust", "13:35", "14:05"],
  ["sun", "Sonntag", "07.06.2026", "Mandora Stage", "Blood Incantation", "14:25", "15:10"],
  ["sun", "Sonntag", "07.06.2026", "Mandora Stage", "Bloodywood", "15:35", "16:20"],
  ["sun", "Sonntag", "07.06.2026", "Mandora Stage", "Breaking Benjamin", "16:45", "17:40"],
  ["sun", "Sonntag", "07.06.2026", "Mandora Stage", "Social Distortion", "18:10", "19:10"],
  ["sun", "Sonntag", "07.06.2026", "Mandora Stage", "Alter Bridge", "19:40", "20:40"],
  ["sun", "Sonntag", "07.06.2026", "Mandora Stage", "A Perfect Circle", "21:20", "22:35"],
  ["sun", "Sonntag", "07.06.2026", "Mandora Stage", "Sabaton", "23:20", "01:00"],
  ["sun", "Sonntag", "07.06.2026", "Orbit Stage", "Mouth Culture", "12:20", "13:00"],
  ["sun", "Sonntag", "07.06.2026", "Orbit Stage", "Ego Kill Talent", "13:25", "14:05"],
  ["sun", "Sonntag", "07.06.2026", "Orbit Stage", "Boundaries", "14:30", "15:10"],
  ["sun", "Sonntag", "07.06.2026", "Orbit Stage", "Gatecreeper", "15:35", "16:15"],
  ["sun", "Sonntag", "07.06.2026", "Orbit Stage", "Catch Your Breath", "16:40", "17:20"],
  ["sun", "Sonntag", "07.06.2026", "Orbit Stage", "TesseracT", "17:45", "18:30"],
  ["sun", "Sonntag", "07.06.2026", "Orbit Stage", "President", "18:55", "19:45"],
  ["sun", "Sonntag", "07.06.2026", "Orbit Stage", "The Story So Far", "20:10", "20:55"],
  ["sun", "Sonntag", "07.06.2026", "Orbit Stage", "Set It Off", "21:20", "22:20"],
  ["sun", "Sonntag", "07.06.2026", "Orbit Stage", "Kublai Khan TX", "22:50", "23:50"],
  ["sun", "Sonntag", "07.06.2026", "Orbit Stage", "Sondaschule", "00:20", "01:30"],
];

const rar: Act[] = rarRows.map(([dayKey, day, date, stage, artist, start, end], index) => ({
  id: `rar-${dayKey}-${index}`,
  festivalId: "rock-am-ring-2026",
  day,
  date,
  stage,
  artist,
  start,
  end,
  source: "official-timetable",
}));

const southsideByDay: Record<string, string[]> = {
  "Donnerstag|18.06.2026": ["MOOP MAMA", "MAJAN", "MOLA", "HI! SPENCER", "BRASSPALAST"],
  "Freitag|19.06.2026": ["BILLY TALENT", "HALSEY", "PROVINZ", "EMPIRE OF THE SUN", "A DAY TO REMEMBER", "CLUESO", "BHZ", "THE BUTCHER SISTERS", "LEVIN LIAM", "LEONY", "FILOW", "RITTER LEAN", "SKINDRED", "SPRINTS", "PA69", "RØRY", "TORS", "VICKY", "DAVINA MICHELLE", "DELILAH BON", "UNPEOPLE", "JUST MUSTARD", "BLACKGOLD", "MODESELEKTOR", "BOYS NOIZE"],
  "Samstag|20.06.2026": ["KRAFTKLUB", "YUNGBLUD", "THE OFFSPRING", "ROY BIANCO & DIE ABBRUNZATI BOYS", "DONOTS", "BOSSE", "SONDASCHULE", "ROYEL OTIS", "DRUNKEN MASTERS", "PENNYWISE", "THE BEACHES", "GRANDSON", "ZEBRAHEAD", "PRESIDENT", "BETTEROV", "BASEMENT", "ESTHER GRAF", "KAYLA SHYX", "RIKAS", "ROSMARIN", "THE ATARIS", "ECCA VANDAL", "ANDA MORTS", "MILITARIE GUN", "PAULA ENGELS", "RAYNOR", "LEILA LAMB", "TUSKER", "MODESTEP (LIVE)", "ROYA", "LISKA"],
  "Sonntag|21.06.2026": ["TWENTY ONE PILOTS", "FLORENCE + THE MACHINE", "PAPA ROACH", "FINCH", "NOTHING BUT THIEVES", "WOLF ALICE", "SSIO", "ALEXISONFIRE", "ALL TIME LOW", "KAFFKIEZ", "NATASHA BEDINGFIELD", "EDWIN ROSEN", "OG KEEMO", "ORVILLE PECK", "KASI", "DESTROY BOYS", "KINGFISHR", "DREI METER FELDWEG", "SCENE QUEEN", "FLORENCE ROAD", "THE SOPHS", "YONAKA", "PICTURE PARLOUR", "DAVID PUENTEZ", "TINLICKER"],
};

const southsideTimes: Record<string, { stage: string; start: string; end: string }> = {
  [southsideTimeKey("18.06.2026", "BRASSPALAST")]: { stage: "Blue Stage", start: "18:30", end: "19:30" },
  [southsideTimeKey("18.06.2026", "HI! SPENCER")]: { stage: "Blue Stage", start: "20:00", end: "21:00" },
  [southsideTimeKey("18.06.2026", "MOLA")]: { stage: "Blue Stage", start: "21:30", end: "22:30" },
  [southsideTimeKey("18.06.2026", "MAJAN")]: { stage: "Blue Stage", start: "23:00", end: "00:15" },
  [southsideTimeKey("18.06.2026", "MOOP MAMA")]: { stage: "Blue Stage", start: "00:45", end: "02:00" },
  [southsideTimeKey("19.06.2026", "JUST MUSTARD")]: { stage: "Green Stage", start: "15:00", end: "15:30" },
  [southsideTimeKey("19.06.2026", "SKINDRED")]: { stage: "Green Stage", start: "16:00", end: "16:45" },
  [southsideTimeKey("19.06.2026", "THE BUTCHER SISTERS")]: { stage: "Green Stage", start: "17:15", end: "18:15" },
  [southsideTimeKey("19.06.2026", "A DAY TO REMEMBER")]: { stage: "Green Stage", start: "19:00", end: "20:00" },
  [southsideTimeKey("19.06.2026", "HALSEY")]: { stage: "Green Stage", start: "21:00", end: "22:00" },
  [southsideTimeKey("19.06.2026", "BILLY TALENT")]: { stage: "Green Stage", start: "23:00", end: "00:30" },
  [southsideTimeKey("19.06.2026", "UNPEOPLE")]: { stage: "Blue Stage", start: "15:30", end: "16:00" },
  [southsideTimeKey("19.06.2026", "DAVINA MICHELLE")]: { stage: "Blue Stage", start: "16:45", end: "17:30" },
  [southsideTimeKey("19.06.2026", "RITTER LEAN")]: { stage: "Blue Stage", start: "18:15", end: "19:15" },
  [southsideTimeKey("19.06.2026", "CLUESO")]: { stage: "Blue Stage", start: "20:00", end: "21:00" },
  [southsideTimeKey("19.06.2026", "EMPIRE OF THE SUN")]: { stage: "Blue Stage", start: "22:00", end: "23:15" },
  [southsideTimeKey("19.06.2026", "PROVINZ")]: { stage: "Blue Stage", start: "00:30", end: "02:00" },
  [southsideTimeKey("19.06.2026", "DELILAH BON")]: { stage: "Red Stage", start: "15:00", end: "15:30" },
  [southsideTimeKey("19.06.2026", "VICKY")]: { stage: "Red Stage", start: "16:00", end: "16:45" },
  [southsideTimeKey("19.06.2026", "PA69")]: { stage: "Red Stage", start: "17:15", end: "18:15" },
  [southsideTimeKey("19.06.2026", "FILOW")]: { stage: "Red Stage", start: "19:00", end: "20:00" },
  [southsideTimeKey("19.06.2026", "LEVIN LIAM")]: { stage: "Red Stage", start: "21:00", end: "22:00" },
  [southsideTimeKey("19.06.2026", "BHZ")]: { stage: "Red Stage", start: "22:45", end: "00:00" },
  [southsideTimeKey("19.06.2026", "BLACKGOLD")]: { stage: "White Stage", start: "15:30", end: "16:00" },
  [southsideTimeKey("19.06.2026", "TORS")]: { stage: "White Stage", start: "16:45", end: "17:45" },
  [southsideTimeKey("19.06.2026", "SPRINTS")]: { stage: "White Stage", start: "18:15", end: "19:15" },
  [southsideTimeKey("19.06.2026", "RØRY")]: { stage: "White Stage", start: "20:00", end: "20:45" },
  [southsideTimeKey("19.06.2026", "LEONY")]: { stage: "White Stage", start: "21:45", end: "22:45" },
  [southsideTimeKey("19.06.2026", "BOYS NOIZE")]: { stage: "White Stage", start: "23:15", end: "00:30" },
  [southsideTimeKey("19.06.2026", "MODESELEKTOR")]: { stage: "White Stage", start: "00:45", end: "02:00" },
  [southsideTimeKey("20.06.2026", "ECCA VANDAL")]: { stage: "Green Stage", start: "13:00", end: "13:30" },
  [southsideTimeKey("20.06.2026", "ZEBRAHEAD")]: { stage: "Green Stage", start: "14:00", end: "14:45" },
  [southsideTimeKey("20.06.2026", "GRANDSON")]: { stage: "Green Stage", start: "15:15", end: "16:00" },
  [southsideTimeKey("20.06.2026", "SONDASCHULE")]: { stage: "Green Stage", start: "16:45", end: "17:45" },
  [southsideTimeKey("20.06.2026", "DONOTS")]: { stage: "Green Stage", start: "18:15", end: "19:15" },
  [southsideTimeKey("20.06.2026", "THE OFFSPRING")]: { stage: "Green Stage", start: "20:15", end: "21:30" },
  [southsideTimeKey("20.06.2026", "KRAFTKLUB")]: { stage: "Green Stage", start: "23:00", end: "00:00" },
  [southsideTimeKey("20.06.2026", "LEILA LAMB")]: { stage: "Blue Stage", start: "12:30", end: "13:00" },
  [southsideTimeKey("20.06.2026", "ANDA MORTS")]: { stage: "Blue Stage", start: "13:30", end: "14:15" },
  [southsideTimeKey("20.06.2026", "RIKAS")]: { stage: "Blue Stage", start: "14:45", end: "15:30" },
  [southsideTimeKey("20.06.2026", "THE BEACHES")]: { stage: "Blue Stage", start: "16:00", end: "16:45" },
  [southsideTimeKey("20.06.2026", "ROYEL OTIS")]: { stage: "Blue Stage", start: "17:30", end: "18:30" },
  [southsideTimeKey("20.06.2026", "BOSSE")]: { stage: "Blue Stage", start: "19:15", end: "20:15" },
  [southsideTimeKey("20.06.2026", "YUNGBLUD")]: { stage: "Blue Stage", start: "21:30", end: "23:00" },
  [southsideTimeKey("20.06.2026", "ROY BIANCO & DIE ABBRUNZATI BOYS")]: { stage: "Blue Stage", start: "00:30", end: "02:00" },
  [southsideTimeKey("20.06.2026", "TUSKER")]: { stage: "Red Stage", start: "13:00", end: "13:30" },
  [southsideTimeKey("20.06.2026", "THE ATARIS")]: { stage: "Red Stage", start: "14:15", end: "14:45" },
  [southsideTimeKey("20.06.2026", "ROSMARIN")]: { stage: "Red Stage", start: "15:15", end: "16:00" },
  [southsideTimeKey("20.06.2026", "PENNYWISE")]: { stage: "Red Stage", start: "16:45", end: "17:45" },
  [southsideTimeKey("20.06.2026", "BASEMENT")]: { stage: "Red Stage", start: "18:15", end: "19:15" },
  [southsideTimeKey("20.06.2026", "PRESIDENT")]: { stage: "Red Stage", start: "20:15", end: "21:30" },
  [southsideTimeKey("20.06.2026", "DRUNKEN MASTERS")]: { stage: "Red Stage", start: "23:00", end: "00:15" },
  [southsideTimeKey("20.06.2026", "LISKA")]: { stage: "White Stage", start: "12:30", end: "13:00" },
  [southsideTimeKey("20.06.2026", "RAYNOR")]: { stage: "White Stage", start: "13:30", end: "14:15" },
  [southsideTimeKey("20.06.2026", "PAULA ENGELS")]: { stage: "White Stage", start: "14:45", end: "15:30" },
  [southsideTimeKey("20.06.2026", "MILITARIE GUN")]: { stage: "White Stage", start: "16:00", end: "16:45" },
  [southsideTimeKey("20.06.2026", "KAYLA SHYX")]: { stage: "White Stage", start: "17:30", end: "18:30" },
  [southsideTimeKey("20.06.2026", "ESTHER GRAF")]: { stage: "White Stage", start: "19:15", end: "20:15" },
  [southsideTimeKey("20.06.2026", "BETTEROV")]: { stage: "White Stage", start: "21:45", end: "22:45" },
  [southsideTimeKey("20.06.2026", "ROYA")]: { stage: "White Stage", start: "23:15", end: "00:30" },
  [southsideTimeKey("20.06.2026", "MODESTEP (LIVE)")]: { stage: "White Stage", start: "00:45", end: "02:00" },
  [southsideTimeKey("21.06.2026", "SCENE QUEEN")]: { stage: "Green Stage", start: "12:00", end: "12:45" },
  [southsideTimeKey("21.06.2026", "DESTROY BOYS")]: { stage: "Green Stage", start: "13:15", end: "14:00" },
  [southsideTimeKey("21.06.2026", "ALL TIME LOW")]: { stage: "Green Stage", start: "14:45", end: "15:45" },
  [southsideTimeKey("21.06.2026", "ALEXISONFIRE")]: { stage: "Green Stage", start: "16:15", end: "17:15" },
  [southsideTimeKey("21.06.2026", "NOTHING BUT THIEVES")]: { stage: "Green Stage", start: "18:00", end: "19:00" },
  [southsideTimeKey("21.06.2026", "PAPA ROACH")]: { stage: "Green Stage", start: "20:15", end: "21:30" },
  [southsideTimeKey("21.06.2026", "TWENTY ONE PILOTS")]: { stage: "Green Stage", start: "22:25", end: "00:00" },
  [southsideTimeKey("21.06.2026", "FLORENCE ROAD")]: { stage: "Blue Stage", start: "12:45", end: "13:30" },
  [southsideTimeKey("21.06.2026", "NATASHA BEDINGFIELD")]: { stage: "Blue Stage", start: "14:00", end: "15:00" },
  [southsideTimeKey("21.06.2026", "KAFFKIEZ")]: { stage: "Blue Stage", start: "15:30", end: "16:30" },
  [southsideTimeKey("21.06.2026", "WOLF ALICE")]: { stage: "Blue Stage", start: "17:15", end: "18:15" },
  [southsideTimeKey("21.06.2026", "FLORENCE + THE MACHINE")]: { stage: "Blue Stage", start: "19:00", end: "20:30" },
  [southsideTimeKey("21.06.2026", "FINCH")]: { stage: "Blue Stage", start: "21:15", end: "22:45" },
  [southsideTimeKey("21.06.2026", "THE SOPHS")]: { stage: "Red Stage", start: "12:00", end: "12:45" },
  [southsideTimeKey("21.06.2026", "DREI METER FELDWEG")]: { stage: "Red Stage", start: "13:15", end: "14:15" },
  [southsideTimeKey("21.06.2026", "KASI")]: { stage: "Red Stage", start: "14:45", end: "15:45" },
  [southsideTimeKey("21.06.2026", "OG KEEMO")]: { stage: "Red Stage", start: "16:15", end: "17:15" },
  [southsideTimeKey("21.06.2026", "EDWIN ROSEN")]: { stage: "Red Stage", start: "18:00", end: "19:00" },
  [southsideTimeKey("21.06.2026", "SSIO")]: { stage: "Red Stage", start: "20:15", end: "21:30" },
  [southsideTimeKey("21.06.2026", "PICTURE PARLOUR")]: { stage: "White Stage", start: "14:00", end: "14:45" },
  [southsideTimeKey("21.06.2026", "YONAKA")]: { stage: "White Stage", start: "15:45", end: "16:30" },
  [southsideTimeKey("21.06.2026", "KINGFISHR")]: { stage: "White Stage", start: "17:15", end: "18:15" },
  [southsideTimeKey("21.06.2026", "ORVILLE PECK")]: { stage: "White Stage", start: "19:15", end: "20:15" },
  [southsideTimeKey("21.06.2026", "TINLICKER")]: { stage: "White Stage", start: "21:15", end: "22:30" },
  [southsideTimeKey("21.06.2026", "DAVID PUENTEZ")]: { stage: "White Stage", start: "22:45", end: "00:00" },
};

const southside: Act[] = Object.entries(southsideByDay).flatMap(([key, artists]) => {
  const [day, date] = key.split("|");
  return artists.map((artist, index) => ({
    id: `southside-${date}-${index}`,
    festivalId: "southside-2026",
    day,
    date,
    stage: southsideTimes[southsideTimeKey(date, artist)]?.stage ?? (artist.includes("NOIZE") || artist.includes("MODESELEKTOR") || artist.includes("PUENTEZ") || artist.includes("TINLICKER") || artist.includes("MODESTEP") || artist === "ROYA" ? "Electric Wave X White Stage" : "TBA"),
    artist,
    start: southsideTimes[southsideTimeKey(date, artist)]?.start,
    end: southsideTimes[southsideTimeKey(date, artist)]?.end,
    source: southsideTimes[southsideTimeKey(date, artist)] ? "official-timetable" : "official-lineup",
  }));
});

const stagetopiaRows: [string, string, string, string][] = [
  ["Hip Hop", "Griezgram", "14:30", "15:05"],
  ["Hip Hop", "Kwam.E", "15:35", "16:20"],
  ["Hip Hop", "6euroneunzig", "16:50", "17:40"],
  ["Hip Hop", "Sampagne", "18:15", "19:05"],
  ["Hip Hop", "PA69", "19:45", "20:45"],
  ["Hip Hop", "Mehnersmoos", "21:30", "22:45"],
  ["Rock", "Lostboi Lino", "15:50", "16:40"],
  ["Rock", "Raum27", "17:10", "18:10"],
  ["Rock", "Deine Cousine", "18:50", "19:50"],
  ["Rock", "Kaffkiez", "20:30", "21:45"],
  ["Electro", "Flo.Von", "14:00", "15:00"],
  ["Electro", "Tony Mejeh", "15:00", "16:00"],
  ["Electro", "Niconé", "16:00", "17:15"],
  ["Electro", "Dirty Doering", "17:15", "18:30"],
  ["Electro", "Björn del Togno B2B Lea Lindner", "18:30", "20:00"],
  ["Electro", "Fjaak B2B Elli Acula", "20:00", "21:30"],
  ["Electro", "Daria Kolosova", "21:30", "23:00"],
  ["Trance", "LMD", "14:00", "15:30"],
  ["Trance", "Formel Trance", "15:30", "17:30"],
  ["Trance", "Disko Rapid", "17:30", "19:30"],
  ["Trance", "Bababass3000", "19:30", "21:30"],
  ["Trance", "DJ Wasserfall B2B DJ Jamba Sparabo", "21:30", "23:30"],
  ["Club", "Kyng Elly", "14:00", "17:00"],
  ["Club", "Raf", "17:00", "20:30"],
  ["Club", "WizardLF", "20:30", "00:00"],
];

const stagetopia: Act[] = stagetopiaRows.map(([stage, artist, start, end]) => ({
  id: `stagetopia-2026-${slugify(artist)}`,
  festivalId: "stagetopia-2026",
  day: "Samstag",
  date: "13.06.2026",
  stage,
  artist,
  start,
  end,
  source: "official-timetable",
}));

const highfieldByDay: Record<string, { warmup?: string[]; concert: string[]; electric?: string[] }> = {
  "Donnerstag|13.08.2026": {
    warmup: ["DRUNKEN MASTERS", "BIERBABES", "DENNIS CONCORDE"],
    concert: [],
    electric: ["THE IRONIX", "MIAMI LENZ", "RUTGER LIVE"],
  },
  "Freitag|14.08.2026": {
    concert: ["SDP", "BHZ", "GIANT ROOKS", "SONDASCHULE", "LEVIN LIAM", "PA69", "ITCHY", "ADAM ANGST", "HI! SPENCER", "DENNIS CONCORDE"],
    electric: ["JOSI MILLER", "CRUX PISTOLS"],
  },
  "Samstag|15.08.2026": {
    concert: ["KRAFTKLUB", "01099", "DROPKICK MURPHYS", "ZARTMANN", "QUERBEAT", "DAS LUMPENPACK", "RITTER LEAN", "RAUM27", "ZSK", "VICKY", "YUNG PEPP", "DENNIS CONCORDE"],
    electric: ["DJ SPORTSCHUH", "CLARA B2B FLAVIUS"],
  },
  "Sonntag|16.08.2026": {
    concert: ["BEATSTEAKS", "MARTERIA", "FEINE SAHNE FISCHFILET", "$OHO BANI", "DILLA", "DEINE COUSINE", "NURA", "MONTREAL", "KAFVKA", "ANAÏS"],
  },
};

const highfield: Act[] = Object.entries(highfieldByDay).flatMap(([key, groups]) => {
  const [day, date] = key.split("|");
  return [
    ...(groups.warmup ?? []).map((artist, index) => ({
      id: `highfield-${date}-warmup-${index}`,
      festivalId: "highfield-2026" as const,
      day,
      date,
      stage: "Warm-Up Party",
      artist,
      source: "official-lineup" as const,
    })),
    ...groups.concert.map((artist, index) => ({
      id: `highfield-${date}-concert-${index}`,
      festivalId: "highfield-2026" as const,
      day,
      date,
      stage: "Concert",
      artist,
      source: "official-lineup" as const,
    })),
    ...(groups.electric ?? []).map((artist, index) => ({
      id: `highfield-${date}-electric-${index}`,
      festivalId: "highfield-2026" as const,
      day,
      date,
      stage: "Electric Beach",
      artist,
      source: "official-lineup" as const,
    })),
  ];
});

export const acts: Act[] = [...rar, ...southside, ...stagetopia, ...highfield];

export function getFestival(id: FestivalId) {
  return festivals.find((festival) => festival.id === id) ?? festivals[0];
}
