/* ============================================================
   PfotenMatch – Dummy-Daten (Hundeprofile, Treffpunkte, Ads)
   ============================================================ */

// Standard-Standort des Nutzers (Basel Marktplatz)
const DEFAULT_LOCATION = { lat: 47.5585, lng: 7.5880 };

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
        lat: 47.5675, lng: 7.5950
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
        lat: 47.5665, lng: 7.5785
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
        lat: 47.5430, lng: 7.5900
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
        lat: 47.5500, lng: 7.5620
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
        lat: 47.5640, lng: 7.6015
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
        lat: 47.5610, lng: 7.5620
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
        lat: 47.5760, lng: 7.6105
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
        lat: 47.5830, lng: 7.6350
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
        lat: 47.5595, lng: 7.5870
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
        lat: 47.5485, lng: 7.5660
    }
];

// Hundefreundliche Treffpunkte in Basel (Schweiz)
const MEETING_SPOTS = [
    { id: 1, name: "Kannenfeldpark",            type: "park",   icon: "🌳", desc: "Grösster Park im Westen Basels, weite Wiesen zum Toben",   lat: 47.5617, lng: 7.5700 },
    { id: 2, name: "Schützenmattpark",          type: "park",   icon: "🌳", desc: "Zentrumsnah mit schattigen Baumgruppen",                   lat: 47.5591, lng: 7.5762 },
    { id: 3, name: "St. Johanns-Park",          type: "park",   icon: "🌲", desc: "Moderner Park direkt am Rhein, Hunde sehr willkommen",     lat: 47.5678, lng: 7.5795 },
    { id: 4, name: "Margarethenpark",           type: "park",   icon: "🌳", desc: "Hügelige Wiese im Gundeli mit toller Aussicht",            lat: 47.5478, lng: 7.5820 },
    { id: 5, name: "Solitude-Park",             type: "park",   icon: "🌊", desc: "Am Rhein beim Tinguely-Museum, Wasserzugang",             lat: 47.5568, lng: 7.6048 },
    { id: 6, name: "Lange Erlen",               type: "park",   icon: "🌲", desc: "Grosses Naherholungsgebiet mit Tierpark",                  lat: 47.5820, lng: 7.6150 },
    { id: 7, name: "Eingezäunter Hundeplatz Landhof", type: "fenced", icon: "🚧", desc: "Komplett eingezäunt, ideal für Welpen & sichere Treffen", lat: 47.5688, lng: 7.6020 },
    { id: 8, name: "Hundecafé 'Waggis & Wuff'", type: "cafe",   icon: "☕", desc: "Hundefreundliches Café mit Wassernapf, nahe Schifflände",  lat: 47.5598, lng: 7.5885 }
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

// Anfangs-Gefahrenmeldungen (Community-Beispiele in Basel)
const DEMO_DANGERS = [
    { id: "d1", type: "poison", lat: 47.5625, lng: 7.5720, desc: "Wurststücke am Rand des Kannenfeldparks gesehen", ts: Date.now() - 3600e3, reporter: "Sabine" },
    { id: "d2", type: "glass",  lat: 47.5685, lng: 7.5830, desc: "Scherben auf dem Rheinuferweg",                    ts: Date.now() - 7200e3, reporter: "Max" }
];

// Simulierte Live-Check-Ins anderer Nutzer
const DEMO_CHECKINS = [
    { spotId: 1, dogName: "Rex",   until: Date.now() + 90 * 60e3 },
    { spotId: 1, dogName: "Luna",  until: Date.now() + 45 * 60e3 },
    { spotId: 3, dogName: "Emma",  until: Date.now() + 60 * 60e3 },
    { spotId: 8, dogName: "Paula", until: Date.now() + 30 * 60e3 }
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

// Hundesitter in Basel & Umgebung
const DOG_SITTERS = [
    {
        id: 101, name: "Sophie Keller", avatar: "👩‍🦰",
        neighborhood: "Kleinbasel", lat: 47.5650, lng: 7.6050,
        rating: 4.9, reviewCount: 47,
        priceHour: 18, priceDay: 85, priceNight: 120,
        services: ["Gassi", "Tag", "Nacht"],
        bio: "Hundeliebhaberin mit 10 Jahren Erfahrung. Großer Garten, katzenfrei, keine anderen Hunde im Haushalt. Jeder Hund bekommt meine ungeteilte Aufmerksamkeit.",
        experience: "10 Jahre", verified: true,
        acceptedSizes: ["Klein", "Mittel", "Groß"],
        responseTime: "~1 Std",
        availability: "Mo–Fr ganztägig, WE nach Absprache"
    },
    {
        id: 102, name: "Marco Rossi", avatar: "🧔",
        neighborhood: "Gundeldingen", lat: 47.5440, lng: 7.5920,
        rating: 4.7, reviewCount: 23,
        priceHour: 15, priceDay: null, priceNight: null,
        services: ["Gassi"],
        bio: "Sportlich, laufe gerne lange Strecken durch die Langen Erlen. Perfekt für energiegeladene Hunde, die viel Bewegung brauchen.",
        experience: "4 Jahre", verified: true,
        acceptedSizes: ["Mittel", "Groß"],
        responseTime: "~30 Min",
        availability: "Täglich 6–9 Uhr und 17–20 Uhr"
    },
    {
        id: 103, name: "Dr. Claudia Weber", avatar: "👵",
        neighborhood: "St. Johann", lat: 47.5700, lng: 7.5780,
        rating: 5.0, reviewCount: 89,
        priceHour: 22, priceDay: 95, priceNight: 140,
        services: ["Gassi", "Tag", "Nacht", "Urlaub"],
        bio: "Pensionierte Tierärztin. Spezialisiert auf ältere Hunde und solche mit medizinischen Bedürfnissen. Medikamentengabe kein Problem.",
        experience: "30+ Jahre", verified: true,
        acceptedSizes: ["Klein", "Mittel", "Groß"],
        responseTime: "~2 Std",
        availability: "Flexibel, am liebsten Tagsüber"
    },
    {
        id: 104, name: "Jonas Schmid", avatar: "👨",
        neighborhood: "Bruderholz", lat: 47.5370, lng: 7.5830,
        rating: 4.6, reviewCount: 12,
        priceHour: 14, priceDay: 75, priceNight: null,
        services: ["Gassi", "Tag"],
        bio: "Student mit viel Zeit zwischen Vorlesungen. Wohne direkt am Margarethenpark — ideal für ausgedehnte Gassirunden.",
        experience: "2 Jahre", verified: false,
        acceptedSizes: ["Klein", "Mittel"],
        responseTime: "~2 Std",
        availability: "Mo, Mi, Fr ganztägig"
    },
    {
        id: 105, name: "Fatima Akyol", avatar: "👩",
        neighborhood: "Matthäus", lat: 47.5680, lng: 7.5920,
        rating: 4.8, reviewCount: 34,
        priceHour: 17, priceDay: 80, priceNight: 125,
        services: ["Gassi", "Tag", "Nacht", "Urlaub"],
        bio: "Zwei eigene Golden Retriever (freundlich, gesellig), dein Hund hat sofort Spielkameraden. Großer umzäunter Garten.",
        experience: "7 Jahre", verified: true,
        acceptedSizes: ["Klein", "Mittel", "Groß"],
        responseTime: "~45 Min",
        availability: "Täglich, auch kurzfristig"
    },
    {
        id: 106, name: "Peter Baumann", avatar: "👴",
        neighborhood: "Riehen", lat: 47.5800, lng: 7.6500,
        rating: 4.9, reviewCount: 61,
        priceHour: 16, priceDay: 90, priceNight: 130,
        services: ["Tag", "Nacht", "Urlaub"],
        bio: "Rentner mit viel Zeit und Liebe für Tiere. Hatte selbst bis vor kurzem zwei Berner Sennen. Ruhiges Haus am Dorfrand.",
        experience: "20 Jahre", verified: true,
        acceptedSizes: ["Mittel", "Groß"],
        responseTime: "~3 Std",
        availability: "Ganztägig, außer Dienstag"
    },
    {
        id: 107, name: "Lea Hofer", avatar: "👱‍♀️",
        neighborhood: "Iselin", lat: 47.5580, lng: 7.5640,
        rating: 4.5, reviewCount: 8,
        priceHour: 12, priceDay: null, priceNight: null,
        services: ["Gassi"],
        bio: "Tierpflegerin in Ausbildung. Faires Einstiegsangebot — ich sammle gerade Erfahrung und Bewertungen.",
        experience: "< 1 Jahr", verified: false,
        acceptedSizes: ["Klein", "Mittel"],
        responseTime: "~4 Std",
        availability: "Wochenenden und Abende"
    },
    {
        id: 108, name: "Tobias Furrer", avatar: "👨‍🦱",
        neighborhood: "Breite", lat: 47.5520, lng: 7.6100,
        rating: 4.8, reviewCount: 29,
        priceHour: 20, priceDay: 88, priceNight: 135,
        services: ["Gassi", "Tag", "Nacht"],
        bio: "Zertifizierter Hundetrainer mit eigener Praxis. Verbinde Sitting gerne mit leichtem Training — Grundkommandos, Leinenführigkeit.",
        experience: "8 Jahre", verified: true,
        acceptedSizes: ["Klein", "Mittel", "Groß"],
        responseTime: "~1 Std",
        availability: "Di–Sa, So auf Anfrage"
    }
];
