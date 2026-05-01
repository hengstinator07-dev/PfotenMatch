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

// POI-Kategorien für die Karten-Suche & -Filter
const POI_CATEGORIES = [
    { id: "park",     label: "Freilaufzonen", icon: "🌳", color: "#2ecc71" },
    { id: "fenced",   label: "Eingezäunt",    icon: "🚧", color: "#3498db" },
    { id: "swim",     label: "Badestellen",   icon: "🏊", color: "#1abc9c" },
    { id: "shop",     label: "Hundeläden",    icon: "🦴", color: "#e67e22" },
    { id: "vet",      label: "Tierärzte",     icon: "🏥", color: "#e74c3c" },
    { id: "groom",    label: "Hundesalons",   icon: "💈", color: "#9b59b6" },
    { id: "cafe",     label: "Cafés",         icon: "☕", color: "#f39c12" },
    { id: "school",   label: "Hundeschulen",  icon: "🎓", color: "#34495e" },
    { id: "sight",    label: "Sehenswürdigkeiten", icon: "🏛️", color: "#8e44ad" }
];

// Points of Interest (Basel). Erweitern die MEETING_SPOTS um weitere Kategorien.
const POIS = [
    // Freilauf & Parks (Referenz zu MEETING_SPOTS)
    { id: 201, cat: "park",   name: "Kannenfeldpark",              desc: "Grosse Wiesen, Freilauf erlaubt",                    lat: 47.5617, lng: 7.5700, rating: 4.7, open: "24 h" },
    { id: 202, cat: "park",   name: "Schützenmattpark",            desc: "Zentrale Hundewiese mit Schatten",                    lat: 47.5591, lng: 7.5762, rating: 4.4, open: "24 h" },
    { id: 203, cat: "park",   name: "St. Johanns-Park",            desc: "Rheinnah, moderne Anlage",                            lat: 47.5678, lng: 7.5795, rating: 4.6, open: "24 h" },
    { id: 204, cat: "park",   name: "Margarethenpark",             desc: "Hügelige Wiese mit Aussicht",                         lat: 47.5478, lng: 7.5820, rating: 4.5, open: "24 h" },
    { id: 205, cat: "park",   name: "Lange Erlen",                 desc: "Weitläufiges Naherholungsgebiet",                     lat: 47.5820, lng: 7.6150, rating: 4.9, open: "24 h" },
    { id: 206, cat: "fenced", name: "Hundeplatz Landhof",          desc: "Komplett eingezäunt, sicher für Welpen",              lat: 47.5688, lng: 7.6020, rating: 4.3, open: "06–22 Uhr" },

    // Badestellen
    { id: 210, cat: "swim",  name: "Hundebadi Birs",               desc: "Flache Badestelle an der Birs, Freilauf möglich",     lat: 47.5400, lng: 7.6200, rating: 4.8, open: "24 h" },
    { id: 211, cat: "swim",  name: "Rheinbadi St. Johann",         desc: "Steg und seichter Einstieg",                           lat: 47.5715, lng: 7.5788, rating: 4.5, open: "24 h" },
    { id: 212, cat: "swim",  name: "Wiesebadi",                    desc: "Schmaler Fluss, ideal für kleine Hunde",              lat: 47.5805, lng: 7.6020, rating: 4.6, open: "24 h" },

    // Hundeläden
    { id: 220, cat: "shop",  name: "Fressnapf Basel",              desc: "Grosse Auswahl an Futter & Zubehör",                  lat: 47.5545, lng: 7.5880, rating: 4.2, open: "Mo–Sa 09–19" },
    { id: 221, cat: "shop",  name: "Qualipet Dreispitz",           desc: "Shop mit Selbstwaschanlage",                           lat: 47.5380, lng: 7.6060, rating: 4.4, open: "Mo–Sa 09–18" },
    { id: 222, cat: "shop",  name: "Hundeladen 'Schnüffel & Co.'", desc: "Kleiner Bioladen mit Naturkausnacks",                 lat: 47.5670, lng: 7.5810, rating: 4.9, open: "Di–Fr 10–18" },

    // Tierärzte
    { id: 230, cat: "vet",   name: "Tierarztpraxis Dr. Müller",    desc: "Allgemeinpraxis, Notfalldienst Mo–Fr",                lat: 47.5620, lng: 7.5900, rating: 4.7, open: "Mo–Fr 08–18" },
    { id: 231, cat: "vet",   name: "Tierklinik Basel",             desc: "24/7 Notfallklinik mit Chirurgie",                     lat: 47.5500, lng: 7.5700, rating: 4.6, open: "24 h" },
    { id: 232, cat: "vet",   name: "Kleintierpraxis am Rhein",     desc: "Sanfte Behandlung, Akupunktur",                        lat: 47.5695, lng: 7.5900, rating: 4.9, open: "Mo–Fr 09–17" },

    // Hundesalons
    { id: 240, cat: "groom", name: "Wuffi Salon",                  desc: "Waschen, Schneiden, Krallen kürzen",                  lat: 47.5570, lng: 7.5820, rating: 4.8, open: "Di–Sa 09–18" },
    { id: 241, cat: "groom", name: "Pfoten-Spa Gundeli",           desc: "Wellness und Fellpflege",                              lat: 47.5450, lng: 7.5890, rating: 4.7, open: "Mi–Sa 10–19" },

    // Cafés
    { id: 250, cat: "cafe",  name: "Café Waggis & Wuff",           desc: "Hundefreundliches Café mit Wassernapf",               lat: 47.5598, lng: 7.5885, rating: 4.6, open: "Mo–So 08–18" },
    { id: 251, cat: "cafe",  name: "Rheinbuvette",                 desc: "Terrasse am Rhein, Leckerli am Tresen",               lat: 47.5605, lng: 7.5920, rating: 4.5, open: "Mi–So 10–22" },
    { id: 252, cat: "cafe",  name: "Kafi Knospe",                  desc: "Kleines Café, Hunde unter dem Tisch willkommen",      lat: 47.5520, lng: 7.5790, rating: 4.4, open: "Mo–Fr 07–17" },

    // Hundeschulen
    { id: 260, cat: "school", name: "Hundeschule Gute Pfote",      desc: "Welpen- und Erziehungskurse",                          lat: 47.5480, lng: 7.5680, rating: 4.9, open: "Termine n.V." },
    { id: 261, cat: "school", name: "Dogs Academy Basel",          desc: "Agility & Beschäftigung",                              lat: 47.5700, lng: 7.6200, rating: 4.7, open: "Termine n.V." },

    // Sehenswürdigkeiten
    { id: 270, cat: "sight", name: "Basler Münster",                desc: "Wahrzeichen der Stadt, Münsterplatz",                   lat: 47.5566, lng: 7.5925, rating: 4.9, open: "24 h" },
    { id: 271, cat: "sight", name: "Mittlere Brücke",              desc: "Älteste Rheinbrücke, schöner Spazierweg",              lat: 47.5603, lng: 7.5896, rating: 4.7, open: "24 h" },
    { id: 272, cat: "sight", name: "Rathaus Basel",                desc: "Prachtvoller roter Rathausbau am Marktplatz",           lat: 47.5577, lng: 7.5886, rating: 4.8, open: "24 h" },
    { id: 273, cat: "sight", name: "Spalentor",                    desc: "Historisches Stadttor von 1400",                        lat: 47.5587, lng: 7.5750, rating: 4.6, open: "24 h" },
    { id: 274, cat: "sight", name: "Tinguely-Brunnen",             desc: "Witzige Wasserskulpturen auf dem Theaterplatz",         lat: 47.5533, lng: 7.5903, rating: 4.5, open: "24 h" },
    { id: 275, cat: "sight", name: "Dreiländereck",                desc: "Wo Schweiz, Deutschland und Frankreich sich treffen",   lat: 47.5894, lng: 7.5885, rating: 4.7, open: "24 h" },
    { id: 276, cat: "sight", name: "Rheinpromenade Kleinbasel",    desc: "Beliebter Spazierweg am Rhein",                         lat: 47.5625, lng: 7.5950, rating: 4.8, open: "24 h" },
    { id: 277, cat: "sight", name: "Pfalz (Münster-Terrasse)",     desc: "Aussichtspunkt über den Rhein",                         lat: 47.5562, lng: 7.5935, rating: 4.9, open: "24 h" },
    { id: 278, cat: "sight", name: "Fondation Beyeler (Garten)",   desc: "Skulpturengarten, Hunde im Aussenbereich erlaubt",     lat: 47.5913, lng: 7.6497, rating: 4.8, open: "10–18 Uhr" },
    { id: 279, cat: "sight", name: "Zoo Basel (Zolli) Umgebung",   desc: "Spazierweg rund um den Zoo",                            lat: 47.5477, lng: 7.5790, rating: 4.6, open: "24 h" }
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
    { id: "poison",  label: "Giftköder",               icon: "☠️", lucide: "skull" },
    { id: "glass",   label: "Scherben",                icon: "🔪", lucide: "alert-circle" },
    { id: "cattle",  label: "Freilaufende Weidetiere", icon: "🐄", lucide: "triangle-alert" },
    { id: "traffic", label: "Verkehrsgefahr",          icon: "🚗", lucide: "car" },
    { id: "other",   label: "Sonstige Gefahr",         icon: "⚠",  lucide: "alert-triangle" }
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
    "Wuff! Klingt super!",
    "Mein Hund würde sich freuen!",
    "Wann habt ihr Zeit?",
    "Lass uns das Wochenende einplanen!",
    "Wir waren schon mal dort – sehr schön!",
    "Super, bis dann!"
];

// Hundesitter in Basel & Umgebung
const DOG_SITTERS = [
    {
        id: 101, name: "Sophie Keller", avatar: "👩‍🦰",
        avatarImage: null,
        photos: [],
        neighborhood: "Kleinbasel", lat: 47.5650, lng: 7.6050,
        rating: 4.9, reviewCount: 47,
        priceHour: 18, priceDay: 85, priceNight: 120,
        services: ["Gassi", "Tag", "Nacht"],
        bio: "Hundeliebhaberin mit 10 Jahren Erfahrung. Großer Garten, katzenfrei, keine anderen Hunde im Haushalt. Jeder Hund bekommt meine ungeteilte Aufmerksamkeit.",
        experience: "10 Jahre", verified: true,
        acceptedSizes: ["Klein", "Mittel", "Groß"],
        responseTime: "~1 Std",
        availability: "Mo–Fr ganztägig, WE nach Absprache",
        about: "Ich lebe in einer großen Altbauwohnung mit Garten in Kleinbasel. Keine Kinder, keine anderen Haustiere — dein Hund hat meine volle Aufmerksamkeit. Ich bin ausgebildete Hundetrainerin.",
        homeDetails: { yard: true, otherPets: "Keine", children: false, smokeFree: true },
        reviews: [
            { id: "r1", reviewer: "Lisa M.", dogName: "Mochi", rating: 5, text: "Sophie ist fantastisch! Mochi war super glücklich und hat sogar neue Tricks gelernt.", ts: Date.now() - 86400000 * 3 },
            { id: "r2", reviewer: "Tim K.", dogName: "Buddy", rating: 5, text: "Zuverlässig, liebevoll und professionell. Buddy will immer wieder zu Sophie!", ts: Date.now() - 86400000 * 12 },
            { id: "r3", reviewer: "Sandra B.", dogName: "Luna", rating: 4, text: "Sehr zufrieden. Sophie hat sich perfekt um Luna gekümmert während unseres Urlaubs.", ts: Date.now() - 86400000 * 25 }
        ]
    },
    {
        id: 102, name: "Marco Rossi", avatar: "🧔",
        avatarImage: null,
        photos: [],
        neighborhood: "Gundeldingen", lat: 47.5440, lng: 7.5920,
        rating: 4.7, reviewCount: 23,
        priceHour: 15, priceDay: null, priceNight: null,
        services: ["Gassi"],
        bio: "Sportlich, laufe gerne lange Strecken durch die Langen Erlen. Perfekt für energiegeladene Hunde, die viel Bewegung brauchen.",
        experience: "4 Jahre", verified: true,
        acceptedSizes: ["Mittel", "Groß"],
        responseTime: "~30 Min",
        availability: "Täglich 6–9 Uhr und 17–20 Uhr",
        about: "Ich bin leidenschaftlicher Läufer und nehme deinen Hund gerne auf meine Joggingrunden mit. Die Langen Erlen sind mein Revier.",
        homeDetails: { yard: false, otherPets: "Keine", children: false, smokeFree: true },
        reviews: [
            { id: "r4", reviewer: "Andrea W.", dogName: "Rex", rating: 5, text: "Marco hat Rex richtig ausgepowert — kam total glücklich zurück!", ts: Date.now() - 86400000 * 5 },
            { id: "r5", reviewer: "Jan D.", dogName: "Thor", rating: 4, text: "Super Gassi-Service, pünktlich und Thor liebt ihn.", ts: Date.now() - 86400000 * 18 }
        ]
    },
    {
        id: 103, name: "Dr. Claudia Weber", avatar: "👵",
        avatarImage: null,
        photos: [],
        neighborhood: "St. Johann", lat: 47.5700, lng: 7.5780,
        rating: 5.0, reviewCount: 89,
        priceHour: 22, priceDay: 95, priceNight: 140,
        services: ["Gassi", "Tag", "Nacht", "Urlaub"],
        bio: "Pensionierte Tierärztin. Spezialisiert auf ältere Hunde und solche mit medizinischen Bedürfnissen. Medikamentengabe kein Problem.",
        experience: "30+ Jahre", verified: true,
        acceptedSizes: ["Klein", "Mittel", "Groß"],
        responseTime: "~2 Std",
        availability: "Flexibel, am liebsten Tagsüber",
        about: "Als pensionierte Tierärztin bringe ich 30 Jahre medizinisches Wissen mit. Ich kümmere mich besonders gerne um ältere Hunde oder solche mit speziellen Bedürfnissen.",
        homeDetails: { yard: true, otherPets: "Keine", children: false, smokeFree: true },
        reviews: [
            { id: "r6", reviewer: "Monika H.", dogName: "Benny", rating: 5, text: "Benny braucht täglich Medikamente — Claudia macht das perfekt. Absolute Vertrauensperson!", ts: Date.now() - 86400000 * 2 },
            { id: "r7", reviewer: "Peter S.", dogName: "Max", rating: 5, text: "Goldene Hände, goldenes Herz. Max hat sich bei ihr richtig erholt nach der OP.", ts: Date.now() - 86400000 * 10 },
            { id: "r8", reviewer: "Julia R.", dogName: "Nala", rating: 5, text: "Einfach die Beste. Nala war 2 Wochen bei ihr und es war alles perfekt.", ts: Date.now() - 86400000 * 30 }
        ]
    },
    {
        id: 104, name: "Jonas Schmid", avatar: "👨",
        avatarImage: null,
        photos: [],
        neighborhood: "Bruderholz", lat: 47.5370, lng: 7.5830,
        rating: 4.6, reviewCount: 12,
        priceHour: 14, priceDay: 75, priceNight: null,
        services: ["Gassi", "Tag"],
        bio: "Student mit viel Zeit zwischen Vorlesungen. Wohne direkt am Margarethenpark — ideal für ausgedehnte Gassirunden.",
        experience: "2 Jahre", verified: false,
        acceptedSizes: ["Klein", "Mittel"],
        responseTime: "~2 Std",
        availability: "Mo, Mi, Fr ganztägig",
        about: "Ich studiere Biologie an der Uni Basel und liebe Tiere. Meine WG-Mitbewohner sind auch alle hundefreundlich.",
        homeDetails: { yard: false, otherPets: "Keine", children: false, smokeFree: false },
        reviews: [
            { id: "r9", reviewer: "Karin F.", dogName: "Fifi", rating: 5, text: "Jonas ist super lieb zu Fifi. Faire Preise und sehr zuverlässig.", ts: Date.now() - 86400000 * 8 }
        ]
    },
    {
        id: 105, name: "Fatima Akyol", avatar: "👩",
        avatarImage: null,
        photos: [],
        neighborhood: "Matthäus", lat: 47.5680, lng: 7.5920,
        rating: 4.8, reviewCount: 34,
        priceHour: 17, priceDay: 80, priceNight: 125,
        services: ["Gassi", "Tag", "Nacht", "Urlaub"],
        bio: "Zwei eigene Golden Retriever (freundlich, gesellig), dein Hund hat sofort Spielkameraden. Großer umzäunter Garten.",
        experience: "7 Jahre", verified: true,
        acceptedSizes: ["Klein", "Mittel", "Groß"],
        responseTime: "~45 Min",
        availability: "Täglich, auch kurzfristig",
        about: "Ich habe zwei Golden Retriever (Sunny & Goldie) und einen großen umzäunten Garten. Dein Hund hat sofort Spielkameraden und viel Platz.",
        homeDetails: { yard: true, otherPets: "2 Golden Retriever", children: false, smokeFree: true },
        reviews: [
            { id: "r10", reviewer: "Lena W.", dogName: "Pepper", rating: 5, text: "Pepper und die Golden Retriever sind beste Freunde geworden! Fatima schickt immer Fotos.", ts: Date.now() - 86400000 * 4 },
            { id: "r11", reviewer: "David M.", dogName: "Rocky", rating: 5, text: "Kurzfristig eingesprungen und alles war perfekt organisiert. Top!", ts: Date.now() - 86400000 * 15 },
            { id: "r12", reviewer: "Nina P.", dogName: "Loki", rating: 4, text: "Sehr nett, großer Garten, Loki war glücklich. Gerne wieder!", ts: Date.now() - 86400000 * 22 }
        ]
    },
    {
        id: 106, name: "Peter Baumann", avatar: "👴",
        avatarImage: null,
        photos: [],
        neighborhood: "Riehen", lat: 47.5800, lng: 7.6500,
        rating: 4.9, reviewCount: 61,
        priceHour: 16, priceDay: 90, priceNight: 130,
        services: ["Tag", "Nacht", "Urlaub"],
        bio: "Rentner mit viel Zeit und Liebe für Tiere. Hatte selbst bis vor kurzem zwei Berner Sennen. Ruhiges Haus am Dorfrand.",
        experience: "20 Jahre", verified: true,
        acceptedSizes: ["Mittel", "Groß"],
        responseTime: "~3 Std",
        availability: "Ganztägig, außer Dienstag",
        about: "Seit ich meine Berner Sennenhunde verloren habe, betreue ich leidenschaftlich gerne andere Hunde. Ruhiges Haus mit Garten am Dorfrand von Riehen.",
        homeDetails: { yard: true, otherPets: "Keine", children: false, smokeFree: true },
        reviews: [
            { id: "r13", reviewer: "Michael T.", dogName: "Zeus", rating: 5, text: "Peter ist ein Schatz. Zeus fühlt sich bei ihm wie zuhause.", ts: Date.now() - 86400000 * 6 },
            { id: "r14", reviewer: "Sarah K.", dogName: "Bella", rating: 5, text: "Wir lassen Bella jedes Mal bei Peter wenn wir in Urlaub sind. Absolute Empfehlung!", ts: Date.now() - 86400000 * 20 }
        ]
    },
    {
        id: 107, name: "Lea Hofer", avatar: "👱‍♀️",
        avatarImage: null,
        photos: [],
        neighborhood: "Iselin", lat: 47.5580, lng: 7.5640,
        rating: 4.5, reviewCount: 8,
        priceHour: 12, priceDay: null, priceNight: null,
        services: ["Gassi"],
        bio: "Tierpflegerin in Ausbildung. Faires Einstiegsangebot — ich sammle gerade Erfahrung und Bewertungen.",
        experience: "< 1 Jahr", verified: false,
        acceptedSizes: ["Klein", "Mittel"],
        responseTime: "~4 Std",
        availability: "Wochenenden und Abende",
        about: "Ich mache gerade meine Ausbildung zur Tierpflegerin und möchte nebenbei praktische Erfahrung sammeln.",
        homeDetails: { yard: false, otherPets: "1 Katze", children: false, smokeFree: true },
        reviews: [
            { id: "r15", reviewer: "Anna L.", dogName: "Cookie", rating: 5, text: "Lea ist super engagiert und Cookie liebt sie!", ts: Date.now() - 86400000 * 7 }
        ]
    },
    {
        id: 108, name: "Tobias Furrer", avatar: "👨‍🦱",
        avatarImage: null,
        photos: [],
        neighborhood: "Breite", lat: 47.5520, lng: 7.6100,
        rating: 4.8, reviewCount: 29,
        priceHour: 20, priceDay: 88, priceNight: 135,
        services: ["Gassi", "Tag", "Nacht"],
        bio: "Zertifizierter Hundetrainer mit eigener Praxis. Verbinde Sitting gerne mit leichtem Training — Grundkommandos, Leinenführigkeit.",
        experience: "8 Jahre", verified: true,
        acceptedSizes: ["Klein", "Mittel", "Groß"],
        responseTime: "~1 Std",
        availability: "Di–Sa, So auf Anfrage",
        about: "Als zertifizierter Hundetrainer biete ich mehr als nur Betreuung: leichtes Training inklusive. Meine Praxis ist in der Breite.",
        homeDetails: { yard: true, otherPets: "Keine", children: false, smokeFree: true },
        reviews: [
            { id: "r16", reviewer: "Mark B.", dogName: "Bruno", rating: 5, text: "Bruno hat bei Tobias das Sitz und Platz gelernt — während der Betreuung! Genial.", ts: Date.now() - 86400000 * 3 },
            { id: "r17", reviewer: "Stefanie H.", dogName: "Lilly", rating: 5, text: "Professionell, kompetent und liebevoll. Lilly zieht nicht mehr an der Leine!", ts: Date.now() - 86400000 * 14 },
            { id: "r18", reviewer: "Oliver G.", dogName: "Sam", rating: 4, text: "Gute Betreuung mit Trainingseffekt. Etwas teurer aber jeden Rappen wert.", ts: Date.now() - 86400000 * 28 }
        ]
    }
];
