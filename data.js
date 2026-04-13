/* ============================================================
   PfotenMatch – Dummy-Daten (Hundeprofile, Treffpunkte, Ads)
   ============================================================ */

// Standard-Standort des Nutzers (Berlin Mitte als Demo)
const DEFAULT_LOCATION = { lat: 52.5170, lng: 13.3889 };

// Hundeprofile
const DOG_PROFILES = [
    {
        id: 1,
        name: "Rex",
        emoji: "🐕",
        breed: "Golden Retriever",
        age: 2,
        size: "Groß",
        neutered: true,
        energy: "Duracell",
        playStyle: "Rennend",
        tags: [],
        warns: [],
        bio: "Ich liebe es, Bällen hinterherzujagen und im See zu schwimmen! Suche ausdauernde Spielkameraden.",
        distance: 1.2,
        owner: "Lisa",
        lat: 52.5205, lng: 13.3750
    },
    {
        id: 2,
        name: "Luna",
        emoji: "🐩",
        breed: "Zwergpudel",
        age: 4,
        size: "Klein",
        neutered: true,
        energy: "Ausgeglichen",
        playStyle: "Zurückhaltend",
        tags: ["Kinderlieb"],
        warns: ["Ängstlich bei großen Hunden"],
        bio: "Eine kleine Diva mit Herz. Ich mag sanftes Spielen und gemütliche Schnüffeltouren.",
        distance: 0.8,
        owner: "Thomas",
        lat: 52.5155, lng: 13.3950
    },
    {
        id: 3,
        name: "Balu",
        emoji: "🐶",
        breed: "Berner Sennenhund",
        age: 5,
        size: "Sehr groß",
        neutered: false,
        energy: "Couch-Potato",
        playStyle: "Zurückhaltend",
        tags: ["Gelassen"],
        warns: [],
        bio: "Ich bin ein sanfter Riese. Nach einer Stunde Spielen bin ich bereit für ein Nickerchen.",
        distance: 3.5,
        owner: "Sabine",
        lat: 52.4950, lng: 13.3650
    },
    {
        id: 4,
        name: "Coco",
        emoji: "🦮",
        breed: "Labrador-Mix",
        age: 1,
        size: "Mittel",
        neutered: false,
        energy: "Duracell",
        playStyle: "Grob",
        tags: ["Verspielt"],
        warns: ["Teilt kein Spielzeug"],
        bio: "Welpenenergie pur! Ich rangele gerne und brauche geduldige Freunde zum Austoben.",
        distance: 2.1,
        owner: "Max",
        lat: 52.5280, lng: 13.4100
    },
    {
        id: 5,
        name: "Emma",
        emoji: "🐕‍🦺",
        breed: "Border Collie",
        age: 3,
        size: "Mittel",
        neutered: true,
        energy: "Duracell",
        playStyle: "Rennend",
        tags: ["Intelligent", "Sportlich"],
        warns: [],
        bio: "Frisbee-Champion auf der Suche nach Trainingspartnern. Ich apportiere alles!",
        distance: 4.7,
        owner: "Julia",
        lat: 52.5400, lng: 13.3900
    },
    {
        id: 6,
        name: "Bruno",
        emoji: "🐶",
        breed: "Boxer",
        age: 6,
        size: "Groß",
        neutered: true,
        energy: "Ausgeglichen",
        playStyle: "Grob",
        tags: ["Treu"],
        warns: ["Leinenaggressiv"],
        bio: "Im Freilauf ein Schmusebär, an der Leine manchmal kompliziert. Suche geduldige Pfoten.",
        distance: 1.9,
        owner: "Michael",
        lat: 52.5240, lng: 13.3700
    },
    {
        id: 7,
        name: "Mia",
        emoji: "🐕",
        breed: "Jack Russell",
        age: 2,
        size: "Klein",
        neutered: true,
        energy: "Duracell",
        playStyle: "Rennend",
        tags: ["Frech"],
        warns: [],
        bio: "Klein aber oho! Ich kann mit den ganz Großen mithalten – wenn sie sanft spielen.",
        distance: 6.3,
        owner: "Anna",
        lat: 52.4800, lng: 13.4400
    },
    {
        id: 8,
        name: "Odin",
        emoji: "🦮",
        breed: "Husky",
        age: 4,
        size: "Groß",
        neutered: false,
        energy: "Duracell",
        playStyle: "Grob",
        tags: ["Abenteurer"],
        warns: ["Jagdinstinkt"],
        bio: "Schnee, Wald, Berge – ich will sie alle! Suche abenteuerlustige Freunde.",
        distance: 8.1,
        owner: "Stefan",
        lat: 52.5600, lng: 13.3200
    },
    {
        id: 9,
        name: "Paula",
        emoji: "🐩",
        breed: "Cavalier King Charles",
        age: 7,
        size: "Klein",
        neutered: true,
        energy: "Couch-Potato",
        playStyle: "Zurückhaltend",
        tags: ["Kuschelig"],
        warns: [],
        bio: "Die ruhige Omi im besten Alter. Gemütlicher Plausch lieber als wildes Toben.",
        distance: 0.5,
        owner: "Claudia",
        lat: 52.5180, lng: 13.3920
    },
    {
        id: 10,
        name: "Kira",
        emoji: "🐕‍🦺",
        breed: "Schäferhund",
        age: 3,
        size: "Groß",
        neutered: true,
        energy: "Ausgeglichen",
        playStyle: "Rennend",
        tags: ["Wachsam"],
        warns: [],
        bio: "Ich liebe Agility und lange Wanderungen. Immer für Abenteuer zu haben.",
        distance: 2.8,
        owner: "Peter",
        lat: 52.5050, lng: 13.4050
    }
];

// Hundefreundliche Treffpunkte (Demo-Koordinaten in Berlin)
const MEETING_SPOTS = [
    { id: 1, name: "Hundewiese am Tiergarten",      type: "park",   icon: "🌳", desc: "Große freie Wiese, beliebt bei mittleren Hunden", lat: 52.5145, lng: 13.3501 },
    { id: 2, name: "Eingezäunte Auslauffläche Ost", type: "fenced", icon: "🚧", desc: "Komplett eingezäunt, ideal für Welpen",          lat: 52.5220, lng: 13.4150 },
    { id: 3, name: "Waldlauf Nord",                 type: "park",   icon: "🌲", desc: "Schöner Waldweg, Leinenpflicht",                  lat: 52.5450, lng: 13.3800 },
    { id: 4, name: "Hundecafé 'Pfote & Tasse'",     type: "cafe",   icon: "☕", desc: "Hundefreundliches Café mit Wassernapf",           lat: 52.5180, lng: 13.3900 },
    { id: 5, name: "Seeufer Süd",                   type: "park",   icon: "🌊", desc: "Flacher Einstieg zum Planschen",                  lat: 52.4900, lng: 13.3800 },
    { id: 6, name: "Agility-Platz Verein HSV",      type: "fenced", icon: "🏅", desc: "Trainingsplatz, Mo–Fr ab 17 Uhr offen",           lat: 52.5300, lng: 13.4250 }
];

// B2B-Werbung
const ADS = [
    "🦴 Neu im Futterladen nebenan: Bio-Snacks 20 % günstiger – nur diese Woche!",
    "🩺 Tierarztpraxis Dr. Müller: Kostenlose Zahncheck-Woche für Mitglieder.",
    "🎓 Hundeschule 'Gute Pfote': Welpenkurs startet Samstag – jetzt anmelden!",
    "🏖️ Hundestrand am See jetzt geöffnet – mit Mitgliedskarte 2-für-1 Eintritt."
];

// Gefahren-Typen fürs Giftköder-/Gefahren-Radar
const DANGER_TYPES = [
    { id: "poison",  label: "Giftköder",               icon: "☠️" },
    { id: "glass",   label: "Scherben",                icon: "🔪" },
    { id: "cattle",  label: "Freilaufende Weidetiere", icon: "🐄" },
    { id: "traffic", label: "Verkehrsgefahr",          icon: "🚗" },
    { id: "other",   label: "Sonstige Gefahr",         icon: "⚠" }
];

// Anfangs-Gefahrenmeldungen (Community-Beispiele)
const DEMO_DANGERS = [
    { id: "d1", type: "poison", lat: 52.5165, lng: 13.3850, desc: "Mehrere Wurststücke am Waldrand gesehen", ts: Date.now() - 3600e3, reporter: "Sabine" },
    { id: "d2", type: "glass",  lat: 52.5250, lng: 13.4000, desc: "Scherben auf dem Fußweg",                ts: Date.now() - 7200e3, reporter: "Max" }
];

// Simulierte Live-Check-Ins anderer Nutzer (andere Hunde gerade im Park)
const DEMO_CHECKINS = [
    { spotId: 1, dogName: "Rex",  until: Date.now() + 90 * 60e3 },
    { spotId: 1, dogName: "Luna", until: Date.now() + 45 * 60e3 },
    { spotId: 4, dogName: "Paula", until: Date.now() + 30 * 60e3 }
];

// Automatische Chat-Antworten
const AUTO_REPLIES = [
    "Wuff! 🐾 Klingt super!",
    "Mein Hund würde sich freuen!",
    "Wann habt ihr Zeit?",
    "Lass uns das Wochenende einplanen!",
    "Wir waren schon mal dort – sehr schön!",
    "Super, bis dann! 🐶"
];
