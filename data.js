/* ============================================================
   PfotenMatch – Dummy-Daten (Hundeprofile, Treffpunkte, Ads)
   ============================================================ */

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
        x: 35, y: 40
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
        x: 60, y: 55
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
        x: 20, y: 70
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
        x: 75, y: 30
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
        x: 50, y: 20
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
        x: 30, y: 25
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
        x: 80, y: 65
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
        x: 15, y: 50
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
        x: 65, y: 45
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
        x: 45, y: 75
    }
];

// Hundefreundliche Treffpunkte
const MEETING_SPOTS = [
    { id: 1, name: "Hundewiese am Stadtpark", type: "park",   icon: "🌳", desc: "Große freie Wiese, beliebt bei mittleren Hunden", x: 40, y: 35 },
    { id: 2, name: "Eingezäunte Auslauffläche Ost", type: "fenced", icon: "🚧", desc: "Komplett eingezäunt, ideal für Welpen", x: 70, y: 60 },
    { id: 3, name: "Waldlauf Nord", type: "park", icon: "🌲", desc: "Schöner Waldweg, Leinenpflicht", x: 25, y: 20 },
    { id: 4, name: "Hundecafé ‚Pfote & Tasse'", type: "cafe", icon: "☕", desc: "Hundefreundliches Café mit Wassernapf", x: 55, y: 50 },
    { id: 5, name: "Seeufer Süd", type: "park", icon: "🌊", desc: "Flacher Einstieg zum Planschen", x: 35, y: 80 },
    { id: 6, name: "Agility-Platz Verein HSV", type: "fenced", icon: "🏅", desc: "Trainingsplatz, Mo–Fr ab 17 Uhr offen", x: 80, y: 25 }
];

// B2B-Werbung
const ADS = [
    "🦴 Neu im Futterladen nebenan: Bio-Snacks 20 % günstiger – nur diese Woche!",
    "🩺 Tierarztpraxis Dr. Müller: Kostenlose Zahncheck-Woche für Mitglieder.",
    "🎓 Hundeschule 'Gute Pfote': Welpenkurs startet Samstag – jetzt anmelden!",
    "🏖️ Hundestrand am See jetzt geöffnet – mit Mitgliedskarte 2-für-1 Eintritt."
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
