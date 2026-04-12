# 🐾 PfotenMatch

**Tinder für Hunde-Spielkameraden** – eine Prototyp-App, mit der Hundebesitzer
den perfekten Spielpartner im Umkreis finden können.

## ✨ Features

### Kern-Features
- **🔥 Swipe-Mechanik** mit Drag-Gesten, Like/Nope-Stempeln und Card-Stack-Animation
- **📋 Detaillierte Profile** mit:
  - Alter, Rasse, Größe, Kastrationsstatus
  - Energielevel (Couch-Potato 🛋️ / Ausgeglichen / Duracell-Häschen ⚡)
  - Spielstil (Zurückhaltend / Rennend / Grob)
  - Entfernung in km
- **⚠ Warn-Tags** wie „Leinenaggressiv", „Ängstlich bei großen Hunden", „Teilt kein Spielzeug"
- **📍 Standort-Matching** mit einstellbarem Umkreis-Slider (1–50 km)
- **🗺️ Echte interaktive Karte** (Leaflet + OpenStreetMap – beides
  kommerziell frei nutzbar) mit Pan/Zoom, Umkreis-Visualisierung,
  Geolocation-Button und markierten hundefreundlichen Orten:
  - Hundewiesen, eingezäunte Auslaufflächen, Hundecafés
  - Hunde im Umkreis werden als Pfoten-Marker angezeigt
- **💬 Chat** mit Auto-Antworten pro Match
- **📅 Treffpunkt-Planer** – Ort, Datum und Uhrzeit direkt im Chat vereinbaren
- **🐶 Eigenes Profil** bearbeiten (Name, Rasse, Alter, Größe, Spielstil, …)

### Monetarisierung
- **Freemium-Modell** – Swipen, Matchen und Chatten sind kostenlos
- **Premium-Abo (4,99 €/Monat)**:
  - 👀 „Wer hat mein Profil gelikt?"
  - 🎯 Erweiterte Filter (z. B. Suche nach bestimmten Rassen)
  - 🥷 Unsichtbares Swipen
  - ⭐ 5 Super-Likes pro Tag
  - 🚫 Keine Werbung
- **B2B-Partnerschaften** – gesponserte Banner von Hundeschulen, Tierärzten und
  Futterläden werden alle 3 Swipes für Free-User eingeblendet

## 🚀 Starten

Die App ist ein **einfaches statisches Web-Projekt** – es wird kein Build-Tool
und keine Installation benötigt.

```bash
# Option 1: Einfach im Browser öffnen
open index.html

# Option 2: Mit einem lokalen Webserver
python3 -m http.server 8080
# dann http://localhost:8080 aufrufen
```

Funktioniert auf Desktop und Mobile. Auf Desktop mit der Maus swipen,
auf Mobile per Touch.

## 📂 Dateien

| Datei        | Zweck                                          |
|--------------|------------------------------------------------|
| `index.html` | Struktur: Views, Modals, Navigation            |
| `styles.css` | Komplettes Styling (mobile-first, Tinder-Look) |
| `data.js`    | Dummy-Hundeprofile, Treffpunkte, B2B-Ads       |
| `app.js`     | State-Management, Swipe-Logik, Matches, Chat   |

## 📜 Lizenzen externer Abhängigkeiten

- **[Leaflet](https://leafletjs.com/)** – BSD-2-Clause, kommerziell frei nutzbar
- **[OpenStreetMap](https://www.openstreetmap.org/copyright)** Kartenkacheln – ODbL,
  kommerziell frei nutzbar mit Attribution (im Kartenrand angezeigt)
- **[Google Fonts – Nunito](https://fonts.google.com/specimen/Nunito)** – SIL Open Font License


## 🧪 Ausprobieren

1. **Swipe**-Tab: Karten nach rechts (Like) oder links (Nope) ziehen oder
   die Buttons am unteren Rand nutzen.
2. Bei einem Match öffnet sich der **Match-Overlay** – direkt in den Chat
   springen oder weiter swipen.
3. **Matches**-Tab: alle Matches inkl. letzter Nachricht und Treffen-Button.
4. **Karte**-Tab: hundefreundliche Orte und Hunde im Umkreis.
5. **Profil**-Tab: eigenes Hundeprofil bearbeiten.
6. **Premium**-Badge oben rechts: Upgrade-Dialog testen.

Matches und Premium-Status werden in `localStorage` gespeichert und
bleiben nach einem Reload erhalten.

## 🎯 Zielmarkt

Der Haustiermarkt wächst stark. Hundebesitzer investieren bereitwillig in
das Wohlergehen ihrer Tiere, und mangelnde Sozialisierung sowie inkompatible
Spielpartner sind ein typischer Schmerzpunkt beim Spazierengehen – genau hier
setzt PfotenMatch an.
