/* ============================================================
   PfotenMatch – App-Logik
   ============================================================ */

// ---------- State ----------
const state = {
    profiles: [],       // gefilterte / sichtbare Kandidaten
    currentIdx: 0,
    matches: [],        // [{profile, messages: []}]
    likedBy: [],        // wer hat MICH gelikt (für Premium)
    premium: false,
    radius: 10,
    userLocation: { lat: 47.5585, lng: 7.5880 }, // Default: Basel Marktplatz
    filters: { size: [], play: [], energy: [], breed: "" },
    myProfile: {
        name: "Bello", breed: "Labrador-Mix", age: 3,
        size: "Mittel", neutered: "Nein",
        energy: "Ausgeglichen", playStyle: "Rennend",
        tags: "", bio: "Liebt Stöckchen und Matschpfützen!",
        emoji: "🐕",
        avatarImage: null,   // data URL, falls gesetzt statt emoji
        photos: []           // [{ id, src, ts }]
    },
    settings: {
        push: true, chatNotif: true, matchNotif: true, dangerNotif: true,
        invisible: false, locShare: true, readReceipts: true,
        dark: false, lang: "de", unit: "km",
    },
    activeChatId: null,
    // Live-Check-Ins: [{spotId, dogName, until (ts)}]  (eigener Check-in hat dogName === myProfile.name)
    checkIns: [],
    // Gefahren-Radar: [{id, type, lat, lng, desc, ts, reporter}]
    dangers: [],
    // Stories: [{id, ownerId: "me"|<dogId>, src, ts, caption, viewed}]
    stories: [],
    // Sitter-Buchungen: [{id, sitterId, service, dateFrom, dateTo, hours, notes, total, status, ts}]
    bookings: [],
    // Eigenes Sitter-Profil (null = nicht registriert)
    mySitterProfile: null,
    // Eingehende Anfragen an mich als Sitter
    sitterRequests: [],
    // Pfoten-Stempel pro POI: { [poiId]: ts }
    paws: {},
    // Karte: aktuelle Filter & Suche
    mapFilter: { cats: [], q: "" },
    // Onboarding abgeschlossen?
    onboarded: false
};

// ---------- Utility ----------
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function saveState() {
    try {
        localStorage.setItem("pfotenMatch", JSON.stringify({
            matches: state.matches.map(m => ({
                id: m.profile.id,
                messages: m.messages,
                conversationId: m.conversationId || null,
                friendProfile: m.profile.isFriend ? m.profile : null
            })),
            premium: state.premium,
            onboarded: state.onboarded,
            myProfile: state.myProfile,
            userLocation: state.userLocation,
            checkIns: state.checkIns,
            dangers: state.dangers,
            stories: state.stories.filter(s => s.ownerId === "me"), // nur eigene persistieren
            bookings: state.bookings,
            mySitterProfile: state.mySitterProfile,
            sitterRequests: state.sitterRequests,
            paws: state.paws,
            settings: state.settings
        }));
    } catch (e) { /* ignore */ }
}

function loadState() {
    try {
        const raw = localStorage.getItem("pfotenMatch");
        if (!raw) return;
        const data = JSON.parse(raw);
        if (data.premium) state.premium = true;
        // Explizit oder implizit: Wer schon Daten hatte, muss nicht nochmal onboarden
        if (data.onboarded || Array.isArray(data.matches) && data.matches.length > 0) {
            state.onboarded = true;
        }
        if (data.myProfile) Object.assign(state.myProfile, data.myProfile);
        if (!Array.isArray(state.myProfile.photos)) state.myProfile.photos = [];
        if (data.settings) Object.assign(state.settings, data.settings);
        if (data.userLocation) state.userLocation = data.userLocation;
        if (Array.isArray(data.checkIns)) state.checkIns = data.checkIns;
        if (Array.isArray(data.dangers)) state.dangers = data.dangers;
        if (Array.isArray(data.stories)) state.stories = data.stories;
        if (Array.isArray(data.bookings)) state.bookings = data.bookings;
        if (data.mySitterProfile) state.mySitterProfile = data.mySitterProfile;
        if (Array.isArray(data.sitterRequests)) state.sitterRequests = data.sitterRequests;
        if (data.paws && typeof data.paws === "object") state.paws = data.paws;
        if (Array.isArray(data.matches)) {
            state.matches = data.matches
                .map(m => {
                    if (m.friendProfile) {
                        return { profile: m.friendProfile, messages: m.messages || [], conversationId: m.conversationId || null };
                    }
                    const p = DOG_PROFILES.find(d => d.id === m.id);
                    return p ? { profile: p, messages: m.messages || [] } : null;
                })
                .filter(Boolean);
        }
    } catch (e) { /* ignore */ }
}

// ---------- View switching ----------
function switchView(name) {
    $$(".view").forEach(v => v.classList.remove("active"));
    $("#view-" + name)?.classList.add("active");
    $$(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.view === name));
    if (name === "matches") renderMatches();
    if (name === "map") renderMap();
    if (name === "profile") renderProfile();
    if (name === "sitter") renderSitterView();
}

// ---------- Compatibility scoring ----------
// Erzeugt einen 0–100 Score, wie gut zwei Hunde zusammenpassen.
// Basis: Größe (35), Energie (30), Spielstil (25), Tags/Bonus (10)
function computeCompatibility(me, dog) {
    if (!me || !dog) return 50;
    let score = 0;

    // Größe: exakt match = voll, ein Stufe daneben = halb
    const sizes = ["klein", "mittel", "groß"];
    const mySize = (me.size || "").toLowerCase();
    const dSize  = (dog.size || "").toLowerCase();
    const myIdx  = sizes.findIndex(s => mySize.startsWith(s));
    const dIdx   = sizes.findIndex(s => dSize.startsWith(s));
    if (myIdx >= 0 && dIdx >= 0) {
        const diff = Math.abs(myIdx - dIdx);
        score += diff === 0 ? 35 : diff === 1 ? 20 : 8;
    } else {
        score += 18;
    }

    // Energie
    const myEn = (me.energy || "").toLowerCase();
    const dEn  = (dog.energy || "").toLowerCase();
    if (myEn && dEn) {
        if (myEn === dEn) score += 30;
        else if (
            (myEn.includes("hoch") && dEn.includes("mittel")) ||
            (myEn.includes("mittel") && dEn.includes("hoch")) ||
            (myEn.includes("mittel") && dEn.includes("niedrig")) ||
            (myEn.includes("niedrig") && dEn.includes("mittel"))
        ) score += 18;
        else score += 6;
    } else score += 15;

    // Spielstil
    const myPlay = (me.playStyle || "").toLowerCase();
    const dPlay  = (dog.playStyle || "").toLowerCase();
    if (myPlay && dPlay) {
        if (myPlay === dPlay) score += 25;
        else if (myPlay.split(/\W+/).some(t => t && dPlay.includes(t))) score += 14;
        else score += 4;
    } else score += 12;

    // Tag-Overlap Bonus
    const myTags = (me.tags || []).map(t => t.toLowerCase());
    const dTags  = (dog.tags || []).map(t => t.toLowerCase());
    const overlap = myTags.filter(t => dTags.includes(t)).length;
    score += Math.min(10, overlap * 4);

    // Warnungen ziehen leicht ab
    if (dog.warns && dog.warns.length) score -= dog.warns.length * 2;

    // Deterministischer kleiner Jitter, damit Werte nicht glatt wirken
    const jitter = ((dog.id || 0) * 7) % 5;
    score += jitter - 2;

    return Math.max(35, Math.min(99, Math.round(score)));
}

function compatibilityLabel(score) {
    if (score >= 90) return "Perfect Match";
    if (score >= 78) return "Top Match";
    if (score >= 65) return "Guter Match";
    return "Könnte passen";
}

// ---------- Daily Top-Pick ----------
function todayKey() {
    const d = new Date();
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
}

let _dailyPickCache = null;
function getDailyTopPickId() {
    const key = todayKey();
    if (_dailyPickCache && _dailyPickCache.key === key) return _dailyPickCache.id;
    try {
        const raw = localStorage.getItem("pfotenMatch.dailyPick");
        if (raw) {
            const data = JSON.parse(raw);
            if (data.key === key && data.id != null) {
                _dailyPickCache = data;
                return data.id;
            }
        }
    } catch (e) { /* ignore */ }
    // Neu bestimmen: bester Score unter den aktuell sichtbaren Profilen
    let bestId = null;
    let bestScore = -1;
    const pool = (state.profiles && state.profiles.length) ? state.profiles : DOG_PROFILES;
    pool.forEach(p => {
        if (state.matches.some(m => m.profile.id === p.id)) return;
        const s = computeCompatibility(state.myProfile, p);
        if (s > bestScore) { bestScore = s; bestId = p.id; }
    });
    const data = { key, id: bestId, score: bestScore };
    try { localStorage.setItem("pfotenMatch.dailyPick", JSON.stringify(data)); } catch (e) { /* ignore */ }
    _dailyPickCache = data;
    return bestId;
}

function renderDailyPickBanner() {
    const banner = $("#dailyPickBanner");
    if (!banner) return;
    const pickId = getDailyTopPickId();
    if (pickId == null) { banner.classList.add("hidden"); return; }
    const dog = (state.profiles || []).find(p => p.id === pickId) ||
                DOG_PROFILES.find(p => p.id === pickId);
    // Wenn der Pick nicht mehr im Swipe-Stack ist (gematcht/raus), Banner verstecken
    const stillAvailable = state.profiles.some(p => p.id === pickId);
    if (!dog || !stillAvailable) { banner.classList.add("hidden"); return; }
    const score = computeCompatibility(state.myProfile, dog);
    const sub = $("#dailyPickSubtitle");
    if (sub) sub.textContent = `${dog.name} · ${score}% Match – heute dein Favorit!`;
    banner.classList.remove("hidden");
}

function jumpToDailyPick() {
    const pickId = getDailyTopPickId();
    if (pickId == null) return;
    const idx = state.profiles.findIndex(p => p.id === pickId);
    if (idx >= 0) {
        state.currentIdx = idx;
        renderCardStack();
    }
}

// ---------- Matches-Tab Unread-Badge ----------
function updateMatchesNavBadge() {
    const badge = $("#matchesNavBadge");
    if (!badge) return;
    const totalUnread = state.matches.reduce((sum, m) => {
        return sum + (chatUi.unread[m.profile.id] || 0);
    }, 0);
    if (totalUnread > 0) {
        badge.textContent = totalUnread > 9 ? "9+" : String(totalUnread);
        badge.classList.remove("hidden");
    } else {
        badge.classList.add("hidden");
    }
}

// ---------- Profile filtering ----------
function applyFilters() {
    const { size, play, energy, breed } = state.filters;
    state.profiles = DOG_PROFILES.filter(p => {
        if (p.distance > state.radius) return false;
        if (size.length && !size.some(s => p.size.startsWith(s))) return false;
        if (play.length && !play.some(s => p.playStyle.includes(s))) return false;
        if (energy.length && !energy.some(s => p.energy.includes(s))) return false;
        if (state.premium && breed && !p.breed.toLowerCase().includes(breed.toLowerCase())) return false;
        if (state.matches.some(m => m.profile.id === p.id)) return false;
        return true;
    });
    state.profiles.sort((a, b) =>
        computeCompatibility(state.myProfile, b) - computeCompatibility(state.myProfile, a)
    );
    state.currentIdx = 0;
    renderCardStack();
    updateFilterBadge();
    renderActiveFilterChips();
}

// ---------- Filter Bottom-Sheet ----------
function openFilterSheet() {
    $("#filterOverlay").classList.remove("hidden");
    $("#filterSheet").classList.add("open");
    syncFilterChips();
}
function closeFilterSheet() {
    // Check breed premium gate
    const breedVal = $("#fBreed").value.trim();
    if (breedVal && !state.premium) {
        $("#fBreed").value = "";
        openPremium();
    }
    state.filters.breed = $("#fBreed").value.trim();
    $("#filterOverlay").classList.add("hidden");
    $("#filterSheet").classList.remove("open");
    applyFilters();
    if (leafletMap) renderMap();
}
function bindFilterSheet() {
    $("#openFiltersBtn").addEventListener("click", openFilterSheet);
    $("#filterOverlay").addEventListener("click", closeFilterSheet);
    $("#closeFilterSheet").addEventListener("click", closeFilterSheet);
    // Radius slider (in filter-bar)
    $("#radiusSlider").addEventListener("input", (e) => {
        state.radius = parseInt(e.target.value);
        $("#radiusLabel").textContent = state.radius;
        applyFilters();
        if (leafletMap) renderMap();
    });
    // Chip toggles — multi-select with live apply
    $$(".fs-chip").forEach(chip => {
        chip.addEventListener("click", () => {
            const key = chip.dataset.filter;   // "size" | "energy" | "play"
            const val = chip.dataset.val;
            const arr = state.filters[key];
            const idx = arr.indexOf(val);
            if (idx >= 0) { arr.splice(idx, 1); chip.classList.remove("active"); }
            else          { arr.push(val);       chip.classList.add("active"); }
            applyFilters();
            if (leafletMap) renderMap();
        });
    });
    // Breed input — live apply with debounce
    let breedTimer;
    $("#fBreed").addEventListener("input", (e) => {
        clearTimeout(breedTimer);
        breedTimer = setTimeout(() => {
            const v = e.target.value.trim();
            if (v && !state.premium) return;
            state.filters.breed = v;
            applyFilters();
        }, 300);
    });
    // Reset
    $("#resetFilterBtn").addEventListener("click", () => {
        state.filters = { size: [], play: [], energy: [], breed: "" };
        state.radius = 10;
        $("#radiusSlider").value = 10;
        $("#radiusLabel").textContent = "10";
        $("#fBreed").value = "";
        syncFilterChips();
        applyFilters();
        if (leafletMap) renderMap();
    });
    // Handle drag-down to close
    const sheet = $("#filterSheet");
    const handle = sheet.querySelector(".fs-handle");
    let startY = 0, currentY = 0, dragging = false;
    handle.addEventListener("touchstart", (e) => {
        startY = e.touches[0].clientY;
        dragging = true;
        sheet.style.transition = "none";
    });
    handle.addEventListener("touchmove", (e) => {
        if (!dragging) return;
        currentY = e.touches[0].clientY - startY;
        if (currentY > 0) sheet.style.transform = `translateY(${currentY}px)`;
    });
    handle.addEventListener("touchend", () => {
        dragging = false;
        sheet.style.transition = "";
        sheet.style.transform = "";
        if (currentY > 80) closeFilterSheet();
        currentY = 0;
    });
}
function syncFilterChips() {
    $$(".fs-chip").forEach(chip => {
        const key = chip.dataset.filter;
        const val = chip.dataset.val;
        chip.classList.toggle("active", state.filters[key].includes(val));
    });
    $("#radiusSlider").value = state.radius;
    $("#radiusLabel").textContent = state.radius;
    $("#fBreed").value = state.filters.breed || "";
}
function countActiveFilters() {
    const f = state.filters;
    let n = f.size.length + f.play.length + f.energy.length;
    if (f.breed) n++;
    if (state.radius !== 10) n++;
    return n;
}
function updateFilterBadge() {
    const n = countActiveFilters();
    const badge = $("#filterBadge");
    badge.textContent = n;
    badge.classList.toggle("hidden", n === 0);
    const btn = $("#openFiltersBtn");
    btn.classList.toggle("has-filters", n > 0);
}
const FILTER_LABELS = {
    size: { "Klein": "🐾 Klein", "Mittel": "🐕 Mittel", "Groß": "🐕‍🦺 Groß", "Sehr groß": "🦮 XL" },
    energy: { "Couch-Potato": "🛋️ Couch", "Ausgeglichen": "🐾 Ausgeglichen", "Duracell": "⚡ Duracell" },
    play: { "Zurückhaltend": "🤗 Ruhig", "Rennend": "🏃 Rennend", "Grob": "🤼 Grob" }
};
function renderActiveFilterChips() {
    const wrap = $("#activeFilterChips");
    wrap.innerHTML = "";
    const f = state.filters;
    ["size", "energy", "play"].forEach(key => {
        f[key].forEach(val => {
            const chip = document.createElement("button");
            chip.className = "active-chip";
            chip.innerHTML = `${FILTER_LABELS[key][val] || val} <span class="ac-x">✕</span>`;
            chip.addEventListener("click", () => {
                const idx = f[key].indexOf(val);
                if (idx >= 0) f[key].splice(idx, 1);
                applyFilters();
                if (leafletMap) renderMap();
            });
            wrap.appendChild(chip);
        });
    });
    if (state.radius !== 10) {
        const chip = document.createElement("button");
        chip.className = "active-chip";
        chip.innerHTML = `📍 ${state.radius} km <span class="ac-x">✕</span>`;
        chip.addEventListener("click", () => {
            state.radius = 10;
            $("#radiusSlider").value = 10;
            $("#radiusLabel").textContent = "10";
            applyFilters();
            if (leafletMap) renderMap();
        });
        wrap.appendChild(chip);
    }
    if (f.breed) {
        const chip = document.createElement("button");
        chip.className = "active-chip premium";
        chip.innerHTML = `★ ${f.breed} <span class="ac-x">✕</span>`;
        chip.addEventListener("click", () => {
            f.breed = "";
            $("#fBreed").value = "";
            applyFilters();
        });
        wrap.appendChild(chip);
    }
}

// ---------- Card stack rendering ----------
function renderCardStack() {
    const stack = $("#cardStack");
    stack.innerHTML = "";
    renderDailyPickBanner();
    const remaining = state.profiles.slice(state.currentIdx, state.currentIdx + 3).reverse();

    if (remaining.length === 0) {
        stack.style.aspectRatio = "auto";
        stack.innerHTML = `
            <div class="empty-cards">
                <div class="big">🐾</div>
                <h3>Keine Hunde mehr in der Nähe</h3>
                <p>Versuche den Umkreis zu erweitern oder schau später wieder rein!</p>
            </div>`;
        return;
    }
    stack.style.aspectRatio = "";

    remaining.forEach((dog, i) => {
        const card = document.createElement("div");
        card.className = "dog-card";
        card.dataset.id = dog.id;
        card.style.zIndex = i + 1;
        const scale = 1 - (remaining.length - 1 - i) * 0.03;
        const y = (remaining.length - 1 - i) * 8;
        card.style.transform = `translateY(${y}px) scale(${scale})`;

        const warnsHtml = dog.warns.map(w => `<span class="tag warn">⚠ ${w}</span>`).join("");
        const tagsHtml  = dog.tags.map(t => `<span class="tag">${t}</span>`).join("");
        const score = computeCompatibility(state.myProfile, dog);
        const scoreClass = score >= 85 ? "high" : score >= 70 ? "mid" : "low";
        const topPickId = getDailyTopPickId();
        const isTopPick = dog.id === topPickId;

        card.innerHTML = `
            <div class="photo" style="background: linear-gradient(135deg, #ffd5cd, #ffebe0);">
                <div>${dog.emoji}</div>
                ${isTopPick ? `<div class="top-pick-badge">⭐ Top-Pick heute</div>` : ""}
                <div class="compat-badge ${scoreClass}" title="${compatibilityLabel(score)}">
                    🎯 <strong>${score}%</strong> Match
                </div>
            </div>
            <div class="stamp like">LIKE</div>
            <div class="stamp nope">NOPE</div>
            <div class="stamp super">SUPER</div>
            <div class="info">
                <h3>${dog.name}, ${dog.age}</h3>
                <p class="sub">${dog.breed} · ${dog.size} · ${dog.distance} km</p>
                <p class="sub">⚡ ${dog.energy} · 🎾 ${dog.playStyle}${dog.neutered ? " · kastriert" : ""}</p>
                <div class="tags">${tagsHtml}${warnsHtml}</div>
            </div>
        `;

        stack.appendChild(card);
        if (i === remaining.length - 1) attachSwipe(card, dog);
    });
}

// ---------- Swipe gestures ----------
function attachSwipe(card, dog) {
    let startX = 0, startY = 0, currX = 0, currY = 0, dragging = false;

    const onDown = (e) => {
        dragging = true;
        card.classList.add("dragging");
        const pt = e.touches ? e.touches[0] : e;
        startX = pt.clientX;
        startY = pt.clientY;
    };
    const onMove = (e) => {
        if (!dragging) return;
        const pt = e.touches ? e.touches[0] : e;
        currX = pt.clientX - startX;
        currY = pt.clientY - startY;
        // Wenn deutlich nach oben gezogen wird, Rotation reduzieren (für Super-Like-Geste)
        const verticalDominant = currY < -40 && Math.abs(currY) > Math.abs(currX);
        const rot = verticalDominant ? currX * 0.02 : currX * 0.08;
        card.style.transform = `translate(${currX}px, ${currY}px) rotate(${rot}deg)`;
        const likeStamp  = card.querySelector(".stamp.like");
        const nopeStamp  = card.querySelector(".stamp.nope");
        const superStamp = card.querySelector(".stamp.super");
        if (likeStamp && nopeStamp && superStamp) {
            // Super-Stamp dominiert, sobald der Hochzieh-Anteil deutlich ist
            const superOp = Math.max(0, Math.min(1, (-currY - 30) / 100));
            if (verticalDominant) {
                superStamp.style.opacity = superOp;
                likeStamp.style.opacity = 0;
                nopeStamp.style.opacity = 0;
            } else {
                superStamp.style.opacity = superOp * 0.4;
                likeStamp.style.opacity = Math.max(0, currX / 100);
                nopeStamp.style.opacity = Math.max(0, -currX / 100);
            }
        }
    };
    const onUp = () => {
        if (!dragging) return;
        dragging = false;
        card.classList.remove("dragging");
        // Super-Like: deutlich nach oben & weiter als horizontal
        if (currY < -140 && Math.abs(currY) > Math.abs(currX)) {
            if (!state.premium) {
                // Karte zurück, dann Premium-Modal
                card.style.transform = "";
                card.querySelector(".stamp.super").style.opacity = 0;
                currX = 0; currY = 0;
                openPremium();
                return;
            }
            return flyAway(card, dog, "super");
        }
        if (currX >  120) return flyAway(card, dog, "like");
        if (currX < -120) return flyAway(card, dog, "pass");
        card.style.transform = "";
        card.querySelector(".stamp.like").style.opacity = 0;
        card.querySelector(".stamp.nope").style.opacity = 0;
        const sup = card.querySelector(".stamp.super");
        if (sup) sup.style.opacity = 0;
        currX = 0; currY = 0;
    };

    card.addEventListener("mousedown", onDown);
    card.addEventListener("touchstart", onDown, { passive: true });
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
}

function flyAway(card, dog, direction) {
    if (direction === "super") {
        card.style.transform = `translate(0, -${window.innerHeight}px) rotate(0deg)`;
    } else {
        const x = direction === "like" ? window.innerWidth : -window.innerWidth;
        card.style.transform = `translate(${x}px, 0) rotate(${direction === "like" ? 30 : -30}deg)`;
    }
    card.style.opacity = 0;
    setTimeout(() => handleDecision(dog, direction), 280);
}

// ---------- Decision handling ----------
function handleDecision(dog, decision) {
    state.currentIdx++;
    if (decision === "like" || decision === "super") {
        // 60% Match-Chance bei Like, 90% bei Super-Like
        const chance = decision === "super" ? 0.9 : 0.6;
        if (Math.random() < chance) {
            addMatch(dog);
            showMatchModal(dog);
        } else if (Math.random() < 0.3) {
            // Dieser Hund hat mich gelikt, aber kein Match (bei Premium sichtbar)
            state.likedBy.push(dog);
        }
    }
    renderCardStack();
    // gelegentlich eine Werbung zeigen (nicht für Premium)
    if (!state.premium && state.currentIdx > 0 && state.currentIdx % 3 === 0) {
        showAd();
    }
}

function addMatch(dog) {
    if (state.matches.some(m => m.profile.id === dog.id)) return;
    const greetMsg = { id: genMsgId(), from: "them", type: "text", text: `Woof! Ich bin ${dog.name} 🐾`, ts: Date.now(), status: "delivered", reactions: [] };
    state.matches.push({
        profile: dog,
        messages: [greetMsg]
    });
    chatUi.unread[dog.id] = (chatUi.unread[dog.id] || 0) + 1;
    updateMatchesNavBadge();
    saveState();
    sbSaveMatch(dog.id).then(matchRow => {
        if (matchRow) {
            _matchDbIds[dog.id] = matchRow.id;
            sbSaveMessage(matchRow.id, greetMsg).catch(() => {});
        }
    }).catch(() => {});
}

// ---------- Match modal ----------
const MATCH_GREETINGS = [
    "Hey! Wollen wir zusammen Gassi gehen? 🐾",
    "Huhu! Dein Hund sieht ja toll aus – Lust auf einen Spieltermin im Park? 🎾",
    "Hallo! Wir wären gerade in der Nähe – vielleicht ein spontaner Meet-Up? 🐶",
    "Hey, was für ein süßer Vierbeiner! Treffen wir uns mal? 💕",
    "Servus! Unsere Hunde würden sich bestimmt super verstehen 🐕"
];

function pickGreeting(dog) {
    const idx = (dog.id + (state.myProfile.name || "").length) % MATCH_GREETINGS.length;
    return MATCH_GREETINGS[idx];
}

function showMatchModal(dog) {
    const modal = $("#matchModal");
    const score = computeCompatibility(state.myProfile, dog);

    // kurze Spannung vor dem Match
    setTimeout(() => {
        $("#matchText").textContent = `${state.myProfile.name} und ${dog.name} wollen sich treffen!`;
        $("#matchAvatarMine").textContent = state.myProfile.emoji;
        $("#matchAvatarOther").textContent = dog.emoji;

        const pill = $("#matchScorePill");
        if (pill) pill.innerHTML = `🎯 <strong>${score}%</strong> Match`;

        const greeting = pickGreeting(dog);
        $("#matchGreetingText").textContent = greeting;

        modal.classList.remove("hidden");

        // Haptik
        if (navigator.vibrate) {
            try { navigator.vibrate([90, 60, 180]); } catch (e) { /* ignore */ }
        }

        // Konfetti im Match-Overlay
        launchMatchConfetti();

        // "Nachricht senden" öffnet Chat und fügt vorbefüllten Text ein
        $("#sendMessageBtn").onclick = () => {
            modal.classList.add("hidden");
            openChat(dog.id);
            const inp = $("#chatInput");
            if (inp) {
                inp.value = greeting;
                if (typeof toggleSendButton === "function") toggleSendButton();
                inp.focus();
            }
        };

        // "Treffen planen"
        $("#matchPlanBtn").onclick = () => {
            modal.classList.add("hidden");
            openMeetPlanner(dog);
        };

        // "Match teilen"
        $("#matchShareBtn").onclick = async () => {
            const text = `${state.myProfile.name} und ${dog.name} sind ein Match auf PfotenMatch! 🐾❤️ ${score}% Kompatibilität`;
            if (navigator.share) {
                try {
                    await navigator.share({ title: "PfotenMatch", text });
                } catch (e) { /* abgebrochen */ }
            } else if (navigator.clipboard) {
                try {
                    await navigator.clipboard.writeText(text);
                    showToast && showToast("In Zwischenablage kopiert 📋");
                } catch (e) { /* ignore */ }
            }
        };
    }, 650);
}

function launchMatchConfetti() {
    const box = $("#matchConfettiBox");
    if (!box) return;
    box.innerHTML = "";
    const colors = ["#ff6b6b", "#ffd166", "#4ecdc4", "#ff8e8e", "#a8e6cf", "#ffb4a2", "#ffc3a0"];
    for (let i = 0; i < 70; i++) {
        const el = document.createElement("i");
        const angle = Math.random() * Math.PI * 2;
        const dist = 120 + Math.random() * 220;
        el.style.setProperty("--cx", Math.cos(angle) * dist + "px");
        el.style.setProperty("--cy", Math.sin(angle) * dist + "px");
        el.style.setProperty("--cr", (Math.random() * 720 - 360) + "deg");
        el.style.background = colors[Math.floor(Math.random() * colors.length)];
        el.style.animationDelay = (Math.random() * 0.35) + "s";
        box.appendChild(el);
    }
}

// ---------- Matches list ----------
function renderMatches() {
    updateMatchesNavBadge();
    const list = $("#matchesList");
    if (state.matches.length === 0) {
        list.innerHTML = `<p class="empty-state">Noch keine Matches – swipe los! 🐾</p>`;
        return;
    }
    list.innerHTML = "";
    state.matches.forEach(m => {
        const lastMsg = m.messages[m.messages.length - 1];
        const unread = chatUi.unread[m.profile.id] || 0;
        const item = document.createElement("div");
        item.className = "match-item" + (unread > 0 ? " has-unread" : "");
        const preview = lastMsg
            ? (lastMsg.type === "voice" ? "🎤 Sprachnachricht"
              : lastMsg.type === "image" ? "🖼️ Foto"
              : lastMsg.type === "location" ? "📍 Standort"
              : lastMsg.deleted ? "🚫 Nachricht gelöscht"
              : lastMsg.text)
            : "Noch keine Nachricht";
        const prefix = lastMsg && lastMsg.from === "me" ? "Du: " : "";
        const dogStories = getOwnerStories(m.profile.id);
        const hasStory = dogStories.length > 0;
        const allViewed = hasStory && dogStories.every(s => s.viewed);
        const avCls = "av" + (hasStory ? " has-story" : "") + (allViewed ? " viewed" : "");
        item.innerHTML = `
            <div class="${avCls}">${m.profile.emoji}</div>
            <div class="meta">
                <h4>${m.profile.name} · ${m.profile.breed}</h4>
                <p>${escapeHtml(prefix + preview)}</p>
            </div>
            ${unread > 0 ? `<span class="unread">${unread}</span>` : ""}
            <button class="meet-btn" data-meet="${m.profile.id}">📍 Treffen</button>
        `;
        item.addEventListener("click", (e) => {
            if (e.target.dataset.meet) {
                e.stopPropagation();
                openMeetPlanner(m.profile);
                return;
            }
            if (hasStory && e.target.closest(".av")) {
                e.stopPropagation();
                openStoryViewer(m.profile.id);
                return;
            }
            openChat(m.profile.id);
        });
        list.appendChild(item);
    });
}

// ---------- Chat (WhatsApp-Style) ----------
const ATTACH_LOCATIONS = [
    { name: "Kannenfeldpark", desc: "47.5617, 7.5700" },
    { name: "St. Johanns-Park", desc: "47.5678, 7.5795" },
    { name: "Mein Standort", desc: "Live-Position geteilt" }
];

// Transient chat UI state (nicht persistiert)
const chatUi = {
    typingTimer: null,
    replyTo: null,
    voiceTimer: null,
    voiceSeconds: 0,
    contextMsgId: null,
    muted: {},    // {dogId: true}
    unread: {}    // {dogId: count}
};

function genMsgId() {
    return "m" + Date.now() + Math.floor(Math.random() * 1000);
}

function formatTime(ts) {
    const d = new Date(ts);
    return d.getHours().toString().padStart(2, "0") + ":" + d.getMinutes().toString().padStart(2, "0");
}

function formatDay(ts) {
    const d = new Date(ts);
    const today = new Date();
    const yest = new Date(Date.now() - 86400000);
    if (d.toDateString() === today.toDateString()) return "Heute";
    if (d.toDateString() === yest.toDateString()) return "Gestern";
    return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function dogOnlineStatus(dogId) {
    // Deterministisch anhand dogId
    const seed = (dogId * 13 + 7) % 10;
    if (seed < 4) return "online";
    if (seed < 7) return "schreibt…";
    const mins = (seed * 11) % 55 + 3;
    return `zuletzt online vor ${mins} Min`;
}

function migrateMessage(m) {
    // Sorgt dafür, dass ältere Nachrichten die neuen Felder bekommen
    if (!m.id) m.id = genMsgId();
    if (!m.type) m.type = "text";
    if (!m.status) m.status = m.from === "me" ? "read" : "received";
    if (!m.reactions) m.reactions = [];
    return m;
}

function openChat(dogId) {
    const match = state.matches.find(m => m.profile.id === dogId);
    if (!match) return;
    state.activeChatId = dogId;
    match.messages = match.messages.map(migrateMessage);
    resetChatUi();
    if (match.profile.isFriend && match.conversationId) {
        sbLoadChatMessages(match.conversationId).then(msgs => {
            if (msgs.length) {
                match.messages = msgs.map(migrateMessage);
                renderChatMessages();
                saveState();
            }
        }).catch(() => {});
        sbSubscribeChatMessages(match.conversationId, (newMsg) => {
            if (state.activeChatId !== dogId) return;
            if (match.messages.some(m => m.id === newMsg.id)) return;
            match.messages.push(migrateMessage(newMsg));
            renderChatMessages();
            saveState();
        });
    } else {
        sbGetMatchDbId(dogId).then(dbId => {
            if (!dbId) return;
            sbLoadMessages(dbId).then(msgs => {
                if (msgs.length > match.messages.length) {
                    match.messages = msgs.map(migrateMessage);
                    renderChatMessages();
                    saveState();
                }
            }).catch(() => {});
            sbSubscribeMessages(dbId, (newMsg) => {
                if (state.activeChatId !== dogId) return;
                if (match.messages.some(m => m.id === newMsg.id)) return;
                match.messages.push(migrateMessage(newMsg));
                renderChatMessages();
                saveState();
            });
        }).catch(() => {});
    }
    // Header setzen
    const chatAv = $("#chatAvatar");
    chatAv.textContent = match.profile.emoji;
    const dogStories = getOwnerStories(match.profile.id);
    const dogHasStory = dogStories.length > 0;
    const allViewed = dogHasStory && dogStories.every(s => s.viewed);
    chatAv.classList.toggle("has-story", dogHasStory);
    chatAv.classList.toggle("viewed", allViewed);
    chatAv.style.cursor = dogHasStory ? "pointer" : "";
    chatAv.onclick = dogHasStory ? (() => openStoryViewer(match.profile.id)) : null;
    $("#chatName").textContent = `${match.profile.name} · ${match.profile.owner}`;
    const status = dogOnlineStatus(match.profile.id);
    const statusEl = $("#chatStatus");
    statusEl.textContent = status;
    statusEl.classList.toggle("online", status === "online");
    // Unread zurücksetzen
    chatUi.unread[dogId] = 0;
    updateMatchesNavBadge();
    // Alle ungelesenen Them-Nachrichten auf "read" setzen
    match.messages.forEach(m => { if (m.from === "them") m.status = "read"; });
    // Meine gesendeten Nachrichten simuliert als "read" markieren (Gegenüber hat geöffnet)
    match.messages.forEach(m => { if (m.from === "me" && m.status !== "read") m.status = "read"; });
    renderChatMessages();
    $("#chatModal").classList.remove("hidden");
    setTimeout(() => $("#chatInput").focus(), 100);
    saveState();
}

function resetChatUi() {
    chatUi.replyTo = null;
    $("#replyPreview").classList.add("hidden");
    $("#attachMenu").classList.add("hidden");
    $("#typingIndicator").classList.add("hidden");
    $("#voiceRecording").classList.add("hidden");
    $("#sendBtn").classList.add("hidden");
    $("#voiceBtn").classList.remove("hidden");
    if (chatUi.typingTimer) { clearTimeout(chatUi.typingTimer); chatUi.typingTimer = null; }
    if (chatUi.voiceTimer)  { clearInterval(chatUi.voiceTimer); chatUi.voiceTimer = null; }
}

function escapeHtml(s) {
    return String(s || "")
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function renderTicks(status) {
    if (status === "sent")      return `<span class="ticks" title="Gesendet">✓</span>`;
    if (status === "delivered") return `<span class="ticks" title="Zugestellt">✓✓</span>`;
    if (status === "read")      return `<span class="ticks read" title="Gelesen">✓✓</span>`;
    return "";
}

function renderReactions(msg) {
    if (!msg.reactions || msg.reactions.length === 0) return "";
    // gruppiere nach Emoji
    const counts = {};
    msg.reactions.forEach(r => { counts[r.emoji] = (counts[r.emoji] || 0) + 1; });
    const keys = Object.keys(counts);
    return `<div class="bubble-reactions">${keys.map(e =>
        `${e}${counts[e] > 1 ? " " + counts[e] : ""}`
    ).join(" ")}</div>`;
}

function renderQuotedReply(msg, match) {
    if (!msg.replyTo) return "";
    const orig = match.messages.find(m => m.id === msg.replyTo);
    if (!orig) return "";
    const whoName = orig.from === "me" ? (state.myProfile.name || "Ich") : match.profile.name;
    const preview = orig.type === "voice"    ? "🎤 Sprachnachricht"
                  : orig.type === "image"    ? "🖼️ Foto"
                  : orig.type === "location" ? "📍 Standort"
                  : escapeHtml(orig.text || "");
    return `<div class="quoted-reply"><strong>${escapeHtml(whoName)}</strong><div class="q-text">${preview}</div></div>`;
}

function renderBubbleBody(msg) {
    if (msg.deleted) return `<span class="deleted-text">🚫 Nachricht gelöscht</span>`;
    if (msg.type === "voice") {
        const bars = Array.from({ length: 24 }, (_, i) => {
            const h = 6 + ((i * 7 + (msg.id || "").length) % 18);
            return `<i style="height:${h}px"></i>`;
        }).join("");
        return `<div class="voice-msg">
            <button class="play-btn" type="button">▶</button>
            <div class="waveform">${bars}</div>
            <span class="duration">${msg.duration || "0:05"}</span>
        </div>`;
    }
    if (msg.type === "image") {
        if (msg.image && msg.image.startsWith("data:")) {
            return `<div class="image-msg"><img src="${msg.image}" alt="Foto" /></div>${msg.text ? `<div>${escapeHtml(msg.text)}</div>` : ""}`;
        }
        return `<div class="image-msg placeholder">${msg.image || "🖼️"}</div>${msg.text ? `<div>${escapeHtml(msg.text)}</div>` : ""}`;
    }
    if (msg.type === "location") {
        return `<div class="location-msg">
            <div class="icon">📍</div>
            <div class="info">
                <strong>${escapeHtml(msg.location?.name || "Standort")}</strong>
                <small>${escapeHtml(msg.location?.desc || "")}</small>
            </div>
        </div>`;
    }
    return escapeHtml(msg.text || "");
}

function renderChatMessages() {
    const match = state.matches.find(m => m.profile.id === state.activeChatId);
    if (!match) return;
    const box = $("#chatMessages");
    box.innerHTML = "";
    let lastDay = "";
    let lastFrom = null;
    match.messages.forEach((msg, idx) => {
        migrateMessage(msg);
        // Datums-Trenner
        const day = formatDay(msg.ts || Date.now());
        if (day !== lastDay) {
            const sep = document.createElement("div");
            sep.className = "date-separator";
            sep.textContent = day;
            box.appendChild(sep);
            lastDay = day;
            lastFrom = null;
        }
        // System-Nachricht (Treffen)
        if (msg.from === "system") {
            const bubble = document.createElement("div");
            bubble.className = "chat-bubble system";
            bubble.textContent = msg.text;
            box.appendChild(bubble);
            lastFrom = "system";
            return;
        }
        const bubble = document.createElement("div");
        const next = match.messages[idx + 1];
        const isLastOfGroup = !next || next.from !== msg.from ||
                              formatDay(next.ts || Date.now()) !== day;
        const grouped = lastFrom === msg.from;
        bubble.className = "chat-bubble " + msg.from +
                           (isLastOfGroup ? " tail" : "") +
                           (grouped ? " grouped" : "") +
                           (msg.deleted ? " deleted" : "");
        bubble.dataset.msgId = msg.id;
        const ticks = msg.from === "me" && !msg.deleted ? renderTicks(msg.status) : "";
        bubble.innerHTML =
            renderQuotedReply(msg, match) +
            `<div class="bubble-content">${renderBubbleBody(msg)}</div>` +
            `<div class="bubble-meta"><span>${formatTime(msg.ts || Date.now())}</span>${ticks}</div>` +
            renderReactions(msg);
        // Long-press / right-click / double-click öffnet Kontextmenü
        const openCtx = (e) => {
            if (msg.deleted) return;
            e.preventDefault();
            openMsgContextMenu(msg.id);
        };
        bubble.addEventListener("contextmenu", openCtx);
        bubble.addEventListener("dblclick", openCtx);
        let pressTimer = null;
        bubble.addEventListener("touchstart", () => {
            pressTimer = setTimeout(() => openMsgContextMenu(msg.id), 500);
        }, { passive: true });
        bubble.addEventListener("touchend", () => { if (pressTimer) clearTimeout(pressTimer); });
        bubble.addEventListener("touchmove", () => { if (pressTimer) clearTimeout(pressTimer); });
        box.appendChild(bubble);
        lastFrom = msg.from;
    });
    box.scrollTop = box.scrollHeight;
}

function sendMessage(text) {
    const match = state.matches.find(m => m.profile.id === state.activeChatId);
    if (!match || !text.trim()) return;
    const msg = {
        id: genMsgId(),
        from: "me",
        type: "text",
        text: text.trim(),
        ts: Date.now(),
        status: "sent",
        reactions: [],
        replyTo: chatUi.replyTo
    };
    pushMessage(match, msg);
    cancelReply();
    if (match.profile.isFriend && match.conversationId) {
        sbSendChatMessage(match.conversationId, msg).catch(() => {});
    } else {
        scheduleStatusProgression(match);
        scheduleAutoReply(match);
    }
}

function pushMessage(match, msg) {
    match.messages.push(msg);
    renderChatMessages();
    saveState();
    if (!match.profile.isFriend) {
        sbGetMatchDbId(match.profile.id).then(dbId => {
            if (dbId) sbSaveMessage(dbId, msg).catch(() => {});
        }).catch(() => {});
    }
}

function scheduleStatusProgression(match) {
    const myMsgs = match.messages.filter(m => m.from === "me" && m.status !== "read");
    // Letzte meiner Nachrichten: sent → delivered (400ms) → read (1200ms)
    const last = myMsgs[myMsgs.length - 1];
    if (!last) return;
    setTimeout(() => {
        if (last.status === "sent") { last.status = "delivered"; renderChatMessages(); saveState(); }
    }, 450);
    setTimeout(() => {
        last.status = "read";
        renderChatMessages();
        saveState();
    }, 1400);
}

function scheduleAutoReply(match) {
    $("#typingName").textContent = match.profile.name + " schreibt…";
    $("#typingIndicator").classList.remove("hidden");
    const delay = 1100 + Math.random() * 1200;
    if (chatUi.typingTimer) clearTimeout(chatUi.typingTimer);
    chatUi.typingTimer = setTimeout(() => {
        $("#typingIndicator").classList.add("hidden");
        const reply = AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)];
        const active = state.activeChatId === match.profile.id;
        const replyMsg = {
            id: genMsgId(),
            from: "them",
            type: "text",
            text: reply,
            ts: Date.now(),
            status: active ? "read" : "delivered",
            reactions: []
        };
        match.messages.push(replyMsg);
        if (!active) {
            chatUi.unread[match.profile.id] = (chatUi.unread[match.profile.id] || 0) + 1;
            updateMatchesNavBadge();
        }
        if (active) renderChatMessages();
        saveState();
        sbGetMatchDbId(match.profile.id).then(dbId => {
            if (dbId) sbSaveMessage(dbId, replyMsg).catch(() => {});
        }).catch(() => {});
    }, delay);
}

// --- Reply ---
function startReplyTo(msgId) {
    const match = state.matches.find(m => m.profile.id === state.activeChatId);
    if (!match) return;
    const msg = match.messages.find(m => m.id === msgId);
    if (!msg || msg.deleted) return;
    chatUi.replyTo = msgId;
    $("#replyName").textContent = msg.from === "me" ? "Du" : match.profile.name;
    const preview = msg.type === "voice"    ? "🎤 Sprachnachricht"
                  : msg.type === "image"    ? "🖼️ Foto"
                  : msg.type === "location" ? "📍 Standort"
                  : msg.text;
    $("#replyText").textContent = preview;
    $("#replyPreview").classList.remove("hidden");
    $("#chatInput").focus();
}
function cancelReply() {
    chatUi.replyTo = null;
    $("#replyPreview").classList.add("hidden");
}

// --- Reaktionen ---
function addReaction(msgId, emoji) {
    const match = state.matches.find(m => m.profile.id === state.activeChatId);
    if (!match) return;
    const msg = match.messages.find(m => m.id === msgId);
    if (!msg) return;
    msg.reactions = msg.reactions || [];
    // Toggle: wenn ich bereits mit diesem Emoji reagiert habe → entfernen
    const existing = msg.reactions.findIndex(r => r.by === "me" && r.emoji === emoji);
    if (existing >= 0) msg.reactions.splice(existing, 1);
    else {
        // Nur eine Reaktion pro User: vorhandene eigene entfernen
        msg.reactions = msg.reactions.filter(r => r.by !== "me");
        msg.reactions.push({ by: "me", emoji });
    }
    renderChatMessages();
    saveState();
}

// --- Delete ---
function deleteMessage(msgId) {
    const match = state.matches.find(m => m.profile.id === state.activeChatId);
    if (!match) return;
    const msg = match.messages.find(m => m.id === msgId);
    if (!msg) return;
    msg.deleted = true;
    msg.text = "";
    msg.reactions = [];
    renderChatMessages();
    saveState();
}

// --- Copy ---
function copyMessage(msgId) {
    const match = state.matches.find(m => m.profile.id === state.activeChatId);
    const msg = match?.messages.find(m => m.id === msgId);
    if (!msg || !msg.text) return;
    if (navigator.clipboard) navigator.clipboard.writeText(msg.text).catch(() => {});
    flashToast("📋 Kopiert");
}

// --- Context menu ---
function openMsgContextMenu(msgId) {
    chatUi.contextMsgId = msgId;
    $("#msgContextMenu").classList.remove("hidden");
}
function closeMsgContextMenu() {
    chatUi.contextMsgId = null;
    $("#msgContextMenu").classList.add("hidden");
}

// --- Foto-Upload (echtes Bild) ---
function pickPhoto() {
    $("#photoInput").click();
}
function handlePhotoFile(file) {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        // Auf vernünftige Grösse downscalen, damit localStorage nicht explodiert
        const img = new Image();
        img.onload = () => {
            const maxW = 800;
            const scale = Math.min(1, maxW / img.width);
            const canvas = document.createElement("canvas");
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.78);
            sendPhoto(dataUrl);
        };
        img.onerror = () => sendPhoto(ev.target.result);
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
}
function sendPhoto(dataUrl) {
    const match = state.matches.find(m => m.profile.id === state.activeChatId);
    if (!match) return;
    pushMessage(match, {
        id: genMsgId(),
        from: "me",
        type: "image",
        image: dataUrl,
        ts: Date.now(),
        status: "sent",
        reactions: [],
        replyTo: chatUi.replyTo
    });
    cancelReply();
    scheduleStatusProgression(match);
    scheduleAutoReply(match);
}

// --- Location ---
function sendLocation() {
    const match = state.matches.find(m => m.profile.id === state.activeChatId);
    if (!match) return;
    const loc = ATTACH_LOCATIONS[Math.floor(Math.random() * ATTACH_LOCATIONS.length)];
    pushMessage(match, {
        id: genMsgId(),
        from: "me",
        type: "location",
        location: loc,
        ts: Date.now(),
        status: "sent",
        reactions: [],
        replyTo: chatUi.replyTo
    });
    cancelReply();
    scheduleStatusProgression(match);
    scheduleAutoReply(match);
}

// --- Voice ---
function startVoiceRecording() {
    chatUi.voiceSeconds = 0;
    $("#voiceTimer").textContent = "0:00";
    $("#voiceRecording").classList.remove("hidden");
    chatUi.voiceTimer = setInterval(() => {
        chatUi.voiceSeconds++;
        const m = Math.floor(chatUi.voiceSeconds / 60);
        const s = chatUi.voiceSeconds % 60;
        $("#voiceTimer").textContent = m + ":" + s.toString().padStart(2, "0");
    }, 1000);
}
function stopVoiceRecording(send) {
    if (chatUi.voiceTimer) { clearInterval(chatUi.voiceTimer); chatUi.voiceTimer = null; }
    $("#voiceRecording").classList.add("hidden");
    if (!send) return;
    const match = state.matches.find(m => m.profile.id === state.activeChatId);
    if (!match) return;
    const secs = Math.max(chatUi.voiceSeconds, 1);
    const duration = Math.floor(secs / 60) + ":" + (secs % 60).toString().padStart(2, "0");
    pushMessage(match, {
        id: genMsgId(),
        from: "me",
        type: "voice",
        duration,
        ts: Date.now(),
        status: "sent",
        reactions: [],
        replyTo: chatUi.replyTo
    });
    cancelReply();
    scheduleStatusProgression(match);
    scheduleAutoReply(match);
}

// --- Search ---
function runChatSearch(query) {
    const match = state.matches.find(m => m.profile.id === state.activeChatId);
    const box = $("#chatSearchResults");
    box.innerHTML = "";
    if (!match || !query.trim()) return;
    const q = query.trim().toLowerCase();
    const hits = match.messages.filter(m => !m.deleted && (m.text || "").toLowerCase().includes(q));
    if (hits.length === 0) {
        box.innerHTML = `<p class="empty-mini">Keine Treffer.</p>`;
        return;
    }
    hits.forEach(m => {
        const el = document.createElement("div");
        el.className = "search-result";
        const escText = escapeHtml(m.text || "");
        const re = new RegExp("(" + q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "ig");
        el.innerHTML = escText.replace(re, '<span class="hit">$1</span>') +
                       `<small>${m.from === "me" ? "Du" : match.profile.name} · ${formatDay(m.ts)} ${formatTime(m.ts)}</small>`;
        el.addEventListener("click", () => {
            $("#chatSearchModal").classList.add("hidden");
            const bubble = document.querySelector(`.chat-bubble[data-msg-id="${m.id}"]`);
            if (bubble) {
                bubble.scrollIntoView({ behavior: "smooth", block: "center" });
                bubble.classList.add("highlight");
                setTimeout(() => bubble.classList.remove("highlight"), 1500);
            }
        });
        box.appendChild(el);
    });
}

// --- Chat menu actions ---
function clearChatHistory() {
    const match = state.matches.find(m => m.profile.id === state.activeChatId);
    if (!match) return;
    if (!confirm("Gesamten Chatverlauf löschen?")) return;
    match.messages = [];
    saveState();
    renderChatMessages();
    flashToast("🧹 Verlauf gelöscht");
}
function toggleMuteChat() {
    const id = state.activeChatId;
    chatUi.muted[id] = !chatUi.muted[id];
    flashToast(chatUi.muted[id] ? "🔕 Stummgeschaltet" : "🔔 Benachrichtigungen an");
}
function blockCurrentChat() {
    const match = state.matches.find(m => m.profile.id === state.activeChatId);
    if (!match) return;
    if (!confirm(`${match.profile.name} wirklich blockieren?\nDas Match wird entfernt.`)) return;
    state.matches = state.matches.filter(m => m.profile.id !== state.activeChatId);
    saveState();
    $("#chatMenuModal").classList.add("hidden");
    $("#chatModal").classList.add("hidden");
    renderMatches();
    flashToast("🚫 Blockiert");
}

// Toggle send button / voice button abhängig vom Input
function toggleSendButton() {
    const val = $("#chatInput").value.trim();
    if (val) {
        $("#sendBtn").classList.remove("hidden");
        $("#voiceBtn").classList.add("hidden");
    } else {
        $("#sendBtn").classList.add("hidden");
        $("#voiceBtn").classList.remove("hidden");
    }
}

// ---------- Check-Ins ----------
function pruneCheckIns() {
    const now = Date.now();
    state.checkIns = state.checkIns.filter(c => c.until > now);
}
function pruneDangers() {
    // Gefahren verfallen nach 24 h
    const cutoff = Date.now() - 24 * 3600e3;
    state.dangers = state.dangers.filter(d => d.ts > cutoff);
}
function myCheckInFor(spotId) {
    pruneCheckIns();
    return state.checkIns.find(c =>
        c.spotId === spotId && c.dogName === state.myProfile.name
    );
}
function countCheckIns(spotId) {
    pruneCheckIns();
    return state.checkIns.filter(c => c.spotId === spotId).length;
}
function toggleCheckIn(spotId) {
    const spot = MEETING_SPOTS.find(s => s.id === spotId);
    if (!spot) return;
    const existing = myCheckInFor(spotId);
    if (existing) {
        state.checkIns = state.checkIns.filter(c => c !== existing);
        flashToast(`Check-out: ${spot.name}`);
    } else {
        if (!confirm(`Bei „${spot.name}" einchecken?\nAndere Nutzer sehen dich dort 2 Stunden lang.`)) return;
        state.checkIns.push({
            spotId,
            dogName: state.myProfile.name,
            until: Date.now() + 2 * 3600e3
        });
        flashToast(`Eingecheckt: ${spot.icon} ${spot.name}`);
    }
    saveState();
    renderMap();
}

// ---------- Gefahren-Radar ----------
function openDangerReport() {
    const sel = $("#dangerType");
    sel.innerHTML = "";
    DANGER_TYPES.forEach(t => {
        const opt = document.createElement("option");
        opt.value = t.id;
        opt.textContent = `${t.icon} ${t.label}`;
        sel.appendChild(opt);
    });
    $("#dangerDesc").value = "";
    $("#dangerModal").classList.remove("hidden");
}

function saveDangerReport() {
    const typeId = $("#dangerType").value;
    const desc = $("#dangerDesc").value.trim();
    state.dangers.push({
        id: "d" + Date.now(),
        type: typeId,
        lat: state.userLocation.lat,
        lng: state.userLocation.lng,
        desc: desc,
        ts: Date.now(),
        reporter: state.myProfile.name
    });
    saveState();
    $("#dangerModal").classList.add("hidden");
    flashToast("⚠ Gefahr gemeldet – danke!");
    renderMap();
}

function removeDanger(id) {
    if (!confirm("Diese Meldung als erledigt markieren?")) return;
    state.dangers = state.dangers.filter(d => d.id !== id);
    saveState();
    renderMap();
}

function formatAgo(ts) {
    const mins = Math.floor((Date.now() - ts) / 60e3);
    if (mins < 1) return "gerade eben";
    if (mins < 60) return `vor ${mins} Min`;
    const h = Math.floor(mins / 60);
    if (h < 24) return `vor ${h} Std`;
    return `vor ${Math.floor(h / 24)} Tagen`;
}

// ---------- Map (Leaflet + OpenStreetMap) ----------
let leafletMap = null;
let mapLayers = { spots: [], pois: [], clusters: [], me: null, dangers: [] };

function buildEmojiIcon(emoji, size = 32, extraClass = "") {
    return L.divIcon({
        className: "emoji-marker " + extraClass,
        html: `<div class="emoji-pin" style="font-size:${size}px">${emoji}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size]
    });
}

function buildClusterIcon(count) {
    const size = count >= 10 ? 50 : count >= 5 ? 44 : 38;
    return L.divIcon({
        className: "cluster-marker",
        html: `<div class="cluster-bubble" style="width:${size}px;height:${size}px;line-height:${size}px">${count}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2]
    });
}

function getCategoryById(id) {
    return POI_CATEGORIES.find(c => c.id === id);
}

// Filter POIs nach aktivem Filter (Kategorie + Suche)
function filteredPOIs() {
    const cats = state.mapFilter.cats;
    const q = (state.mapFilter.q || "").trim().toLowerCase();
    return POIS.filter(p => {
        if (cats.length && !cats.includes(p.cat)) return false;
        if (q) {
            const hay = (p.name + " " + p.desc + " " + (getCategoryById(p.cat)?.label || "")).toLowerCase();
            if (!hay.includes(q)) return false;
        }
        return true;
    });
}

// Greedy Clustering: gruppiert nahe Pins anhand Pixel-Distanz beim aktuellen Zoom
function clusterPoints(points, pxRadius = 50) {
    if (!leafletMap || points.length === 0) return [];
    const remaining = points.map((p, i) => ({ p, i, used: false }));
    const clusters = [];
    for (const item of remaining) {
        if (item.used) continue;
        item.used = true;
        const basePx = leafletMap.latLngToLayerPoint([item.p.lat, item.p.lng]);
        const group = [item.p];
        let sumLat = item.p.lat, sumLng = item.p.lng;
        for (const other of remaining) {
            if (other.used) continue;
            const px = leafletMap.latLngToLayerPoint([other.p.lat, other.p.lng]);
            if (basePx.distanceTo(px) <= pxRadius) {
                other.used = true;
                group.push(other.p);
                sumLat += other.p.lat;
                sumLng += other.p.lng;
            }
        }
        clusters.push({
            lat: sumLat / group.length,
            lng: sumLng / group.length,
            items: group
        });
    }
    return clusters;
}

function renderMap() {
    const canvas = document.getElementById("mapCanvas");
    if (typeof L === "undefined") {
        canvas.innerHTML = '<p style="padding:20px;text-align:center;color:#888">Karte wird geladen…</p>';
        setTimeout(renderMap, 300);
        return;
    }

    if (!leafletMap) {
        leafletMap = L.map(canvas, {
            center: [state.userLocation.lat, state.userLocation.lng],
            zoom: 14,
            zoomControl: true,
            attributionControl: true,
            zoomSnap: 0.25
        });
        L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
            maxZoom: 20,
            subdomains: "abcd",
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a>'
        }).addTo(leafletMap);
        // Bei Zoom/Move neu clustern
        leafletMap.on("zoomend moveend", () => renderMapMarkers());
    }

    pruneCheckIns();
    pruneDangers();
    renderMapMarkers();
    renderPawCollector();

    setTimeout(() => leafletMap.invalidateSize(), 50);

    // Spot-Liste unterhalb (mit Check-In)
    const list = $("#spotList");
    list.innerHTML = "";
    MEETING_SPOTS.forEach(s => {
        const count = countCheckIns(s.id);
        const checkedIn = !!myCheckInFor(s.id);
        const el = document.createElement("div");
        el.className = "spot-item" + (checkedIn ? " checked-in" : "");
        el.innerHTML = `
            <div class="icon">${s.icon}</div>
            <div class="info">
                <h4>${s.name}</h4>
                <p>${s.desc}</p>
            </div>
            ${count > 0 ? `<span class="checkin-badge">🐾 ${count}</span>` : ""}
            <button class="checkin-btn${checkedIn ? " leave" : ""}" data-spot="${s.id}">
                ${checkedIn ? "Check-out" : "Einchecken"}
            </button>
        `;
        // Klick auf die Kachel (nicht den Button) -> zoomt zur Karte
        el.addEventListener("click", (e) => {
            if (e.target.closest("button")) return;
            leafletMap.setView([s.lat, s.lng], 16);
            setTimeout(() => {
                const found = [...mapLayers.pois, ...mapLayers.spots].find(m => {
                    const ll = m.getLatLng();
                    return Math.abs(ll.lat - s.lat) < 0.0005 && Math.abs(ll.lng - s.lng) < 0.0005;
                });
                if (found) found.openPopup();
            }, 250);
        });
        el.querySelector("button").addEventListener("click", (e) => {
            e.stopPropagation();
            toggleCheckIn(s.id);
        });
        list.appendChild(el);
    });

    // Gefahren-Liste
    const dList = $("#dangerList");
    dList.innerHTML = "";
    if (state.dangers.length === 0) {
        dList.innerHTML = `<p class="empty-mini">Keine aktuellen Gefahren gemeldet. 🙏</p>`;
    } else {
        [...state.dangers].sort((a, b) => b.ts - a.ts).forEach(d => {
            const type = DANGER_TYPES.find(t => t.id === d.type) || DANGER_TYPES[DANGER_TYPES.length - 1];
            const el = document.createElement("div");
            el.className = "danger-item";
            el.innerHTML = `
                <div class="icon">${type.icon}</div>
                <div class="info">
                    <strong>${type.label}</strong>
                    ${d.desc ? `<div>${d.desc}</div>` : ""}
                    <small>${formatAgo(d.ts)} · gemeldet von ${d.reporter}</small>
                </div>
                <button title="Als erledigt markieren" data-remove="${d.id}">✓</button>
            `;
            el.addEventListener("click", (e) => {
                if (e.target.dataset.remove) {
                    e.stopPropagation();
                    removeDanger(d.id);
                    return;
                }
                leafletMap.setView([d.lat, d.lng], 16);
                mapLayers.dangers
                    .find(m => m.getLatLng().lat === d.lat && m.getLatLng().lng === d.lng)
                    ?.openPopup();
            });
            dList.appendChild(el);
        });
    }
}

// Zeichnet alle Marker (POIs, Hunde, Sitter, Gefahren, Eigenstandort) inkl. Clustering.
function renderMapMarkers() {
    if (!leafletMap) return;

    // Alte Marker entfernen
    mapLayers.spots.forEach(m => leafletMap.removeLayer(m));
    mapLayers.pois.forEach(m => leafletMap.removeLayer(m));
    mapLayers.clusters.forEach(m => leafletMap.removeLayer(m));
    mapLayers.dangers.forEach(m => leafletMap.removeLayer(m));
    if (mapLayers.me) leafletMap.removeLayer(mapLayers.me);
    mapLayers.spots = [];
    mapLayers.pois = [];
    mapLayers.clusters = [];
    mapLayers.dangers = [];

    // Eigener Standort + Umkreis
    mapLayers.me = L.marker([state.userLocation.lat, state.userLocation.lng], {
        icon: buildEmojiIcon(state.myProfile.emoji || "🐕", 38, "me-marker"),
        title: "Dein Standort"
    }).addTo(leafletMap).bindPopup(
        `<strong>${escapeHtml(state.myProfile.name || "Du")}</strong><br>Du bist hier 🐾`
    );
    if (mapLayers.radius) leafletMap.removeLayer(mapLayers.radius);
    mapLayers.radius = L.circle([state.userLocation.lat, state.userLocation.lng], {
        radius: state.radius * 1000,
        color: "#ff6b6b",
        weight: 2,
        fillColor: "#ff6b6b",
        fillOpacity: 0.08
    }).addTo(leafletMap);

    // ----- POIs (gefiltert) inkl. Clustering -----
    const pois = filteredPOIs();
    const zoom = leafletMap.getZoom();
    const doCluster = zoom < 14;
    if (doCluster) {
        const clusters = clusterPoints(pois, 60);
        clusters.forEach(c => {
            if (c.items.length === 1) {
                const p = c.items[0];
                addPoiMarker(p);
            } else {
                const m = L.marker([c.lat, c.lng], { icon: buildClusterIcon(c.items.length) }).addTo(leafletMap);
                m.on("click", () => {
                    leafletMap.setView([c.lat, c.lng], Math.min(18, zoom + 2), { animate: true });
                });
                mapLayers.clusters.push(m);
            }
        });
    } else {
        pois.forEach(p => addPoiMarker(p));
    }

    // ----- Gefahren -----
    state.dangers.forEach(d => {
        const type = DANGER_TYPES.find(t => t.id === d.type) || DANGER_TYPES[DANGER_TYPES.length - 1];
        const marker = L.marker([d.lat, d.lng], {
            icon: buildEmojiIcon(type.icon, 30, "danger-marker"),
            title: type.label
        }).addTo(leafletMap);
        marker.bindPopup(
            `<strong>⚠ ${type.label}</strong><br>` +
            (d.desc ? escapeHtml(d.desc) + "<br>" : "") +
            `<small>Gemeldet ${formatAgo(d.ts)} von ${escapeHtml(d.reporter)}</small>`
        );
        mapLayers.dangers.push(marker);
    });
}

// Einzelnen POI-Marker zeichnen (mit Pfoten-Stempel-Logik)
function addPoiMarker(p) {
    const cat = getCategoryById(p.cat);
    const icon = cat ? cat.icon : "📍";
    const visited = !!state.paws[p.id];
    const marker = L.marker([p.lat, p.lng], {
        icon: buildEmojiIcon(icon, 30, "poi-marker " + (visited ? "visited" : "") + " cat-" + p.cat),
        title: p.name
    }).addTo(leafletMap);
    const ratingLine = p.rating ? `⭐ ${p.rating} · ` : "";
    const openLine = p.open ? `🕒 ${p.open}` : "";
    const visitedBadge = visited ? '<br><span style="color:#ff6b6b;font-weight:700">🐾 Schon besucht</span>' : '';
    marker.bindPopup(
        `<strong>${icon} ${escapeHtml(p.name)}</strong><br>` +
        `${escapeHtml(p.desc)}<br>` +
        `<small>${ratingLine}${openLine}</small>` +
        visitedBadge +
        `<br><button class="popup-btn" data-paw="${p.id}">${visited ? "Erneut besuchen" : "🐾 Pfote setzen"}</button>`
    );
    marker.on("popupopen", (e) => {
        const btn = e.popup._contentNode.querySelector("[data-paw]");
        if (btn) btn.addEventListener("click", () => {
            collectPaw(p.id);
            marker.closePopup();
        });
    });
    mapLayers.pois.push(marker);
}

// ---------- Pfoten-Stempel-Sammlung & Wochen-Challenge ----------
function collectPaw(poiId) {
    const isNew = !state.paws[poiId];
    state.paws[poiId] = Date.now();
    saveState();
    if (isNew) {
        flashToast("🐾 Neuer Spot besucht! +1 Pfote");
        burstPawAnimation();
    } else {
        flashToast("🐾 Erneut besucht");
    }
    renderMapMarkers();
    renderPawCollector();
}

function burstPawAnimation() {
    // Kleine Pfoten-Animation, die vom Pfoten-Widget aus startet
    const host = $("#pawCollector");
    if (!host) return;
    const wrap = document.createElement("div");
    wrap.className = "paw-burst";
    for (let i = 0; i < 6; i++) {
        const p = document.createElement("span");
        p.textContent = "🐾";
        p.style.setProperty("--dx", (Math.random() * 120 - 60) + "px");
        p.style.setProperty("--dy", (-60 - Math.random() * 80) + "px");
        p.style.animationDelay = (i * 0.05) + "s";
        wrap.appendChild(p);
    }
    host.appendChild(wrap);
    setTimeout(() => wrap.remove(), 1400);
}

// Wieviele POIs wurden in den letzten 7 Tagen NEU besucht?
function pawsThisWeek() {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return Object.values(state.paws).filter(ts => ts >= cutoff).length;
}

const PAW_BADGES = [
    { count: 1,  emoji: "🐾", label: "Erste Pfote" },
    { count: 5,  emoji: "🥉", label: "Entdecker" },
    { count: 10, emoji: "🥈", label: "Stadt-Streuner" },
    { count: 20, emoji: "🥇", label: "Basel-Profi" },
    { count: 30, emoji: "👑", label: "Pfoten-König" }
];

function renderPawCollector() {
    const total = Object.keys(state.paws).length;
    const totalPois = POIS.length;
    const elTotal = $("#pawTotal");
    const fill = $("#pawBarFill");
    const challenge = $("#pawChallenge");
    const badges = $("#pawBadges");
    if (!elTotal || !fill || !badges) return;

    elTotal.textContent = `${total} / ${totalPois}`;
    fill.style.width = Math.min(100, (total / totalPois) * 100) + "%";

    const week = pawsThisWeek();
    const goal = 5;
    if (week >= goal) {
        challenge.textContent = `🎉 Wochen-Challenge geschafft (${week}/${goal})!`;
        challenge.classList.add("done");
    } else {
        challenge.textContent = `Wochenchallenge: ${week}/${goal} neue Spots besucht`;
        challenge.classList.remove("done");
    }

    badges.innerHTML = "";
    PAW_BADGES.forEach(b => {
        const unlocked = total >= b.count;
        const el = document.createElement("div");
        el.className = "paw-badge" + (unlocked ? " unlocked" : "");
        el.title = b.label + " (" + b.count + " Spots)";
        el.innerHTML = `<span>${b.emoji}</span><small>${b.count}</small>`;
        badges.appendChild(el);
    });
}

// ---------- Map-Suche & Kategorie-Filter ----------
function renderMapCategoryChips() {
    const wrap = $("#mapCatChips");
    if (!wrap) return;
    wrap.innerHTML = "";
    const allBtn = document.createElement("button");
    allBtn.className = "map-chip" + (state.mapFilter.cats.length === 0 ? " active" : "");
    allBtn.textContent = "⭐ Alle";
    allBtn.dataset.cat = "all";
    allBtn.addEventListener("click", () => {
        state.mapFilter.cats = [];
        renderMapCategoryChips();
        renderMapMarkers();
    });
    wrap.appendChild(allBtn);
    POI_CATEGORIES.forEach(c => {
        const btn = document.createElement("button");
        const active = state.mapFilter.cats.includes(c.id);
        btn.className = "map-chip" + (active ? " active" : "");
        btn.dataset.cat = c.id;
        btn.innerHTML = `${c.icon} ${c.label}`;
        btn.addEventListener("click", () => {
            const idx = state.mapFilter.cats.indexOf(c.id);
            if (idx >= 0) state.mapFilter.cats.splice(idx, 1);
            else state.mapFilter.cats.push(c.id);
            renderMapCategoryChips();
            renderMapMarkers();
        });
        wrap.appendChild(btn);
    });
}

function renderMapSearchResults() {
    const box = $("#mapSearchResults");
    const q = (state.mapFilter.q || "").trim().toLowerCase();
    if (!box) return;
    if (!q) { box.classList.add("hidden"); box.innerHTML = ""; return; }

    const results = [];
    // POIs
    POIS.forEach(p => {
        const cat = getCategoryById(p.cat);
        const hay = (p.name + " " + p.desc + " " + (cat?.label || "")).toLowerCase();
        if (hay.includes(q)) results.push({ kind: "poi", item: p, cat });
    });
    // Hunde
    state.profiles.forEach(d => {
        const hay = (d.name + " " + d.breed).toLowerCase();
        if (hay.includes(q)) results.push({ kind: "dog", item: d });
    });
    // Sitter
    if (typeof DOG_SITTERS !== "undefined") {
        DOG_SITTERS.forEach(s => {
            const hay = (s.name + " " + s.neighborhood).toLowerCase();
            if (hay.includes(q)) results.push({ kind: "sitter", item: s });
        });
    }

    if (results.length === 0) {
        box.innerHTML = `<div class="msr-empty">Keine Treffer für "${escapeHtml(q)}"</div>`;
        box.classList.remove("hidden");
        return;
    }

    box.innerHTML = "";
    results.slice(0, 10).forEach(r => {
        const el = document.createElement("button");
        el.className = "msr-item";
        if (r.kind === "poi") {
            el.innerHTML = `<span class="msr-icon">${r.cat?.icon || "📍"}</span>
                <div><strong>${escapeHtml(r.item.name)}</strong><small>${escapeHtml(r.cat?.label || "POI")}</small></div>`;
            el.addEventListener("click", () => focusOnMap(r.item.lat, r.item.lng));
        } else if (r.kind === "dog") {
            el.innerHTML = `<span class="msr-icon">${r.item.emoji}</span>
                <div><strong>${escapeHtml(r.item.name)}</strong><small>${escapeHtml(r.item.breed)} · Hund</small></div>`;
            el.addEventListener("click", () => {
                if (r.item.lat && r.item.lng) focusOnMap(r.item.lat, r.item.lng);
            });
        } else if (r.kind === "sitter") {
            el.innerHTML = `<span class="msr-icon">🏡</span>
                <div><strong>${escapeHtml(r.item.name)}</strong><small>${escapeHtml(r.item.neighborhood)} · Sitter</small></div>`;
            el.addEventListener("click", () => focusOnMap(r.item.lat, r.item.lng));
        }
        box.appendChild(el);
    });
    box.classList.remove("hidden");
}

function focusOnMap(lat, lng) {
    if (!leafletMap) return;
    leafletMap.setView([lat, lng], 17, { animate: true });
    $("#mapSearchResults")?.classList.add("hidden");
}

function bindMapControls() {
    const inp = $("#mapSearch");
    const clear = $("#mapSearchClear");
    if (inp) {
        inp.addEventListener("input", () => {
            state.mapFilter.q = inp.value;
            clear.classList.toggle("hidden", !inp.value);
            renderMapSearchResults();
        });
        inp.addEventListener("focus", () => {
            if (inp.value) renderMapSearchResults();
        });
    }
    if (clear) {
        clear.addEventListener("click", () => {
            inp.value = "";
            state.mapFilter.q = "";
            clear.classList.add("hidden");
            renderMapSearchResults();
            inp.focus();
        });
    }
    document.addEventListener("click", (e) => {
        if (!e.target.closest(".map-searchbar") && !e.target.closest("#mapSearchResults")) {
            $("#mapSearchResults")?.classList.add("hidden");
        }
    });
}

function locateUser() {
    if (!navigator.geolocation) {
        alert("Geolocation wird von deinem Browser nicht unterstützt.");
        return;
    }
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            state.userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            saveState();
            renderMap();
            if (leafletMap) leafletMap.setView([state.userLocation.lat, state.userLocation.lng], 14);
        },
        () => alert("Standort konnte nicht ermittelt werden.")
    );
}

// ---------- Meeting planner ----------
function openMeetPlanner(dog) {
    $("#meetWith").textContent = `Mit ${dog.name} (${dog.breed})`;
    const sel = $("#meetSpot");
    sel.innerHTML = "";
    MEETING_SPOTS.forEach(s => {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.textContent = `${s.icon} ${s.name}`;
        sel.appendChild(opt);
    });
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
    $("#meetDate").value = tomorrow;
    $("#meetModal").classList.remove("hidden");
    $("#sendMeetBtn").onclick = () => {
        const spot = MEETING_SPOTS.find(s => s.id === parseInt(sel.value));
        const date = $("#meetDate").value;
        const time = $("#meetTime").value;
        const match = state.matches.find(m => m.profile.id === dog.id);
        if (match) {
            match.messages.push({
                from: "system",
                text: `📅 Treffen vorgeschlagen: ${spot.icon} ${spot.name} am ${date} um ${time}`,
                ts: Date.now()
            });
            saveState();
        }
        $("#meetModal").classList.add("hidden");
        openChat(dog.id);
    };
}

// ---------- Ads ----------
function showAd() {
    const text = ADS[Math.floor(Math.random() * ADS.length)];
    $("#adText").textContent = text;
    $("#adBanner").classList.remove("hidden");
    setTimeout(() => $("#adBanner").classList.add("hidden"), 6000);
}

// ---------- Premium ----------
function openPremium() {
    $("#premiumModal").classList.remove("hidden");
}
function activatePremium() {
    state.premium = true;
    $("#premiumBadge").classList.add("active");
    $("#premiumModal").classList.add("hidden");
    saveState();
    alert("🎉 Willkommen bei PfotenMatch Premium!\n\nDu kannst jetzt sehen, wer dich gelikt hat, nach Rassen filtern und Super-Likes einsetzen.");
}

// ---------- Profile page (Instagram-Style) ----------
function renderProfile() {
    const p = state.myProfile;
    // Avatar
    const avEl = $("#profileAvatar");
    if (p.avatarImage) {
        avEl.innerHTML = `<img src="${p.avatarImage}" alt="Profilbild" />`;
    } else {
        avEl.textContent = p.emoji || "🐕";
    }
    // Story ring on own profile
    const myStories = getOwnerStories("me");
    const meHas = myStories.length > 0;
    const meAllViewed = meHas && myStories.every(s => s.viewed);
    const btn = $("#profileAvatarBtn");
    btn.classList.toggle("has-story", meHas);
    btn.classList.toggle("viewed", meAllViewed);
    // "Story ansehen" im Menü nur zeigen wenn aktive eigene Story vorhanden
    const viewStoryItem = $("#viewMyStoryBtn");
    if (viewStoryItem) viewStoryItem.hidden = !meHas;
    // Identity
    $("#profileName").textContent = p.name;
    const handle = "@" + (p.name || "hund").toLowerCase().replace(/[^a-z0-9]+/g, "");
    $("#profileHandle").textContent = `${handle} · ${p.breed || "Mischling"} · ${p.age || 0} J.`;
    $("#profileBio").textContent = p.bio || "";
    // Chips
    const chipsEl = $("#profileChips");
    chipsEl.innerHTML = "";
    const chipList = [];
    if (p.size)      chipList.push({ text: "📏 " + p.size });
    if (p.energy)    chipList.push({ text: "⚡ " + p.energy });
    if (p.playStyle) chipList.push({ text: "🎾 " + p.playStyle });
    if (p.neutered === "Ja") chipList.push({ text: "✂ kastriert" });
    (p.tags || "").split(",").map(t => t.trim()).filter(Boolean)
        .forEach(t => chipList.push({ text: "⚠ " + t, warn: true }));
    chipList.forEach(c => {
        const s = document.createElement("span");
        s.className = "chip" + (c.warn ? " warn" : "");
        s.textContent = c.text;
        chipsEl.appendChild(s);
    });
    // Stats
    $("#statPhotos").textContent = (p.photos || []).length;
    $("#statMatches").textContent = state.matches.length;
    const myCheckins = state.checkIns.filter(c => c.dogName === p.name).length;
    $("#statCheckins").textContent = myCheckins;
    // Info-Panel
    $("#infoBreed").textContent    = p.breed || "—";
    $("#infoAge").textContent      = (p.age || 0) + " Jahre";
    $("#infoSize").textContent     = p.size || "—";
    $("#infoNeutered").textContent = p.neutered || "—";
    $("#infoEnergy").textContent   = p.energy || "—";
    $("#infoPlay").textContent     = p.playStyle || "—";
    // Photo grid
    renderProfilePhotos();
}


function renderProfilePhotos() {
    const grid = $("#profilePhotos");
    // Add-Button behalten, Rest neu bauen
    grid.querySelectorAll(".photo-cell:not(.add)").forEach(el => el.remove());
    const addBtn = $("#addPhotoBtn");
    (state.myProfile.photos || []).slice().reverse().forEach(photo => {
        const cell = document.createElement("button");
        cell.className = "photo-cell";
        cell.innerHTML = `<img src="${photo.src}" alt="Foto" />`;
        cell.addEventListener("click", () => openPhotoViewer(photo.id));
        grid.insertBefore(cell, addBtn);
    });
}

function switchProfileTab(name) {
    $$(".profile-tab").forEach(b => b.classList.toggle("active", b.dataset.ptab === name));
    $("#profilePhotos").classList.toggle("hidden", name !== "photos");
    $("#profileInfo").classList.toggle("hidden", name !== "info");
}

// --- Photo gallery ---
function downscaleImage(file, maxW, quality, cb) {
    const reader = new FileReader();
    reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
            const scale = Math.min(1, maxW / img.width);
            const canvas = document.createElement("canvas");
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
            cb(canvas.toDataURL("image/jpeg", quality));
        };
        img.onerror = () => cb(ev.target.result);
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
}

function handleGalleryFile(file) {
    if (!file || !file.type.startsWith("image/")) return;
    downscaleImage(file, 800, 0.78, (dataUrl) => {
        state.myProfile.photos.push({ id: "p" + Date.now(), src: dataUrl, ts: Date.now() });
        saveState();
        renderProfile();
        flashToast("📷 Foto hinzugefügt");
    });
}

function handleAvatarFile(file) {
    if (!file || !file.type.startsWith("image/")) return;
    downscaleImage(file, 400, 0.82, (dataUrl) => {
        state.myProfile.avatarImage = dataUrl;
        saveState();
        renderProfile();
        flashToast("✨ Profilbild aktualisiert");
    });
}

// ---------- Stories (Instagram-Style) ----------
const STORY_DURATION = 24 * 3600e3; // 24h
const STORY_PLAY_MS  = 5000;        // 5s pro Bild
const storyUi = { ownerId: null, idx: 0, timer: null };

function pruneStories() {
    const cutoff = Date.now() - STORY_DURATION;
    state.stories = state.stories.filter(s => s.ts > cutoff);
}
function hasActiveStory(ownerId) {
    pruneStories();
    return state.stories.some(s => s.ownerId === ownerId);
}
function getOwnerStories(ownerId) {
    pruneStories();
    return state.stories
        .filter(s => s.ownerId === ownerId)
        .sort((a, b) => a.ts - b.ts);
}
function storyAgeLabel(ts) {
    const diff = Date.now() - ts;
    if (diff < 60e3)    return "gerade eben";
    if (diff < 3600e3)  return `vor ${Math.floor(diff / 60e3)} Min`;
    return `vor ${Math.floor(diff / 3600e3)} Std`;
}

function handleStoryFile(file) {
    if (!file || !file.type.startsWith("image/")) return;
    downscaleImage(file, 900, 0.8, (dataUrl) => {
        state.stories.push({
            id: "st" + Date.now(),
            ownerId: "me",
            src: dataUrl,
            ts: Date.now(),
            caption: "",
            viewed: false
        });
        saveState();
        renderProfile();
        renderMatches();
        flashToast("📸 Story veröffentlicht");
    });
}

function openStoryViewer(ownerId) {
    const stories = getOwnerStories(ownerId);
    if (!stories.length) return;
    storyUi.ownerId = ownerId;
    storyUi.idx = 0;

    // Header
    let name, avHtml;
    if (ownerId === "me") {
        name = (state.myProfile.name || "Ich") + " (du)";
        if (state.myProfile.avatarImage) {
            avHtml = `<img src="${state.myProfile.avatarImage}" alt="" />`;
        } else {
            avHtml = state.myProfile.emoji || "🐕";
        }
    } else {
        const dog = DOG_PROFILES.find(d => d.id === ownerId);
        if (!dog) return;
        name = `${dog.name} · ${dog.breed}`;
        avHtml = dog.emoji;
    }
    $("#storyName").textContent = name;
    $("#storyAv").innerHTML = avHtml;

    // Build progress segments
    const row = $("#storyProgressRow");
    row.innerHTML = "";
    stories.forEach(() => {
        const seg = document.createElement("div");
        seg.className = "seg";
        seg.innerHTML = `<div class="fill"></div>`;
        row.appendChild(seg);
    });

    $("#storyViewerModal").classList.remove("hidden");
    showStoryFrame();
}

function showStoryFrame() {
    const stories = getOwnerStories(storyUi.ownerId);
    if (storyUi.idx < 0 || storyUi.idx >= stories.length) {
        closeStoryViewer();
        return;
    }
    const s = stories[storyUi.idx];
    $("#storyImage").src = s.src;
    $("#storyCaption").textContent = s.caption || "";
    $("#storyTime").textContent = storyAgeLabel(s.ts);

    // Segment classes
    const segs = $("#storyProgressRow").querySelectorAll(".seg");
    segs.forEach((seg, i) => {
        seg.classList.remove("done", "active");
        if (i <  storyUi.idx) seg.classList.add("done");
        if (i === storyUi.idx) seg.classList.add("active");
    });
    // Restart the active segment's fill animation
    const activeFill = segs[storyUi.idx]?.querySelector(".fill");
    if (activeFill) {
        activeFill.style.animation = "none";
        // force reflow so the restart takes effect
        void activeFill.offsetWidth;
        activeFill.style.animation = "";
    }

    // Own story → delete button visible
    $("#storyDelete").classList.toggle("hidden", storyUi.ownerId !== "me");

    // Mark as viewed
    s.viewed = true;
    if (storyUi.ownerId === "me") saveState();

    // Auto-advance
    if (storyUi.timer) clearTimeout(storyUi.timer);
    storyUi.timer = setTimeout(() => advanceStory(1), STORY_PLAY_MS);
}

function advanceStory(delta) {
    if (storyUi.timer) { clearTimeout(storyUi.timer); storyUi.timer = null; }
    storyUi.idx += delta;
    const stories = getOwnerStories(storyUi.ownerId);
    if (storyUi.idx < 0)  storyUi.idx = 0;
    if (storyUi.idx >= stories.length) {
        closeStoryViewer();
        return;
    }
    showStoryFrame();
}

function closeStoryViewer() {
    if (storyUi.timer) { clearTimeout(storyUi.timer); storyUi.timer = null; }
    $("#storyViewerModal").classList.add("hidden");
    $("#storyImage").src = "";
    storyUi.ownerId = null;
    storyUi.idx = 0;
    // Refresh rings (viewed state may have changed)
    renderProfile();
    renderMatches();
    // Live-update chat header avatar if a chat is currently open
    if (state.activeChatId != null) {
        const chatAv = $("#chatAvatar");
        const stories = getOwnerStories(state.activeChatId);
        const allViewed = stories.length > 0 && stories.every(s => s.viewed);
        chatAv.classList.toggle("viewed", allViewed);
    }
}

function deleteCurrentStory() {
    if (storyUi.ownerId !== "me") return;
    const stories = getOwnerStories("me");
    const s = stories[storyUi.idx];
    if (!s) return;
    if (!confirm("Story wirklich löschen?")) return;
    state.stories = state.stories.filter(x => x.id !== s.id);
    saveState();
    const remaining = getOwnerStories("me");
    if (!remaining.length) {
        closeStoryViewer();
        return;
    }
    // Einfach von vorne neu öffnen
    closeStoryViewer();
    openStoryViewer("me");
}

// Demo-Stories seeden (nur für andere Hunde, eigene werden persistiert)
function seedDemoStoriesIfEmpty() {
    if (state.stories.some(s => s.ownerId !== "me")) return;
    const makeStorySvg = (emoji, c1, c2, text) => {
        const svg =
            `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900">` +
            `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
            `<stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>` +
            `</linearGradient></defs>` +
            `<rect width="600" height="900" fill="url(#g)"/>` +
            `<text x="300" y="440" font-size="260" text-anchor="middle" dominant-baseline="middle">${emoji}</text>` +
            `<text x="300" y="770" font-size="44" text-anchor="middle" fill="white" ` +
            `font-family="sans-serif" font-weight="700">${text}</text>` +
            `</svg>`;
        return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    };
    const now = Date.now();
    const seeds = [
        { ownerId: 1, emoji: "🎾", c1: "#4ecdc4", c2: "#0f7e79", text: "Bällchen gejagt!",   hrs: 2 },
        { ownerId: 1, emoji: "🌊", c1: "#5ab0ff", c2: "#00437a", text: "Schwimmen im Rhein", hrs: 6 },
        { ownerId: 2, emoji: "🌸", c1: "#ff6b9d", c2: "#b3246a", text: "Gassi im Park",      hrs: 1 },
        { ownerId: 3, emoji: "🛋", c1: "#f39c12", c2: "#a85d00", text: "Siesta-Zeit",        hrs: 4 },
        { ownerId: 4, emoji: "🏞", c1: "#27ae60", c2: "#0f5d2a", text: "Berge erkundet",     hrs: 8 },
        { ownerId: 5, emoji: "🦴", c1: "#ff6b6b", c2: "#8a1a1a", text: "Leckerli bekommen!", hrs: 3 }
    ];
    seeds.forEach((s, i) => {
        state.stories.push({
            id: "seed" + i,
            ownerId: s.ownerId,
            src: makeStorySvg(s.emoji, s.c1, s.c2, s.text),
            ts: now - s.hrs * 3600e3,
            caption: s.text,
            viewed: false
        });
    });
}

let currentViewerPhotoId = null;
function openPhotoViewer(photoId) {
    const photo = state.myProfile.photos.find(p => p.id === photoId);
    if (!photo) return;
    currentViewerPhotoId = photoId;
    $("#photoViewerImg").src = photo.src;
    $("#photoViewerModal").classList.remove("hidden");
}
function deleteCurrentPhoto() {
    if (!currentViewerPhotoId) return;
    if (!confirm("Foto wirklich löschen?")) return;
    state.myProfile.photos = state.myProfile.photos.filter(p => p.id !== currentViewerPhotoId);
    currentViewerPhotoId = null;
    saveState();
    $("#photoViewerModal").classList.add("hidden");
    renderProfile();
}

// --- Edit profile modal ---
function setSelectByPrefix(sel, prefix) {
    const el = $(sel);
    if (!el || !prefix) return;
    for (const opt of el.options) {
        if (opt.text.startsWith(prefix)) { el.value = opt.value; return; }
    }
}
function openEditProfile() {
    const p = state.myProfile;
    $("#pfName").value = p.name;
    $("#pfBreed").value = p.breed;
    $("#pfAge").value = p.age;
    $("#pfBio").value = p.bio;
    $("#pfTags").value = p.tags || "";
    setSelectByPrefix("#pfSize", p.size);
    $("#pfNeutered").value = p.neutered || "Nein";
    setSelectByPrefix("#pfEnergy", p.energy);
    setSelectByPrefix("#pfPlay", p.playStyle);
    if (p.avatarImage) {
        $("#avatarPreview").innerHTML = `<img src="${p.avatarImage}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%" />`;
    } else {
        $("#avatarPreview").textContent = p.emoji || "🐕";
    }
    $$(".avatar-options button").forEach(b => {
        b.classList.toggle("selected", b.dataset.emoji === p.emoji);
    });
    $("#editProfileModal").classList.remove("hidden");
}

function bindProfileForm() {
    const f = $("#myProfileForm");
    // Avatar-Emoji-Picker
    $$(".avatar-options button").forEach(b => {
        b.addEventListener("click", () => {
            $$(".avatar-options button").forEach(x => x.classList.remove("selected"));
            b.classList.add("selected");
            state.myProfile.emoji = b.dataset.emoji;
            state.myProfile.avatarImage = null; // Emoji überschreibt Bild
            $("#avatarPreview").textContent = b.dataset.emoji;
        });
    });
    f.addEventListener("submit", (e) => {
        e.preventDefault();
        state.myProfile = {
            ...state.myProfile,
            name: $("#pfName").value,
            breed: $("#pfBreed").value,
            age: parseInt($("#pfAge").value) || 0,
            size: $("#pfSize").value,
            neutered: $("#pfNeutered").value,
            energy: $("#pfEnergy").value,
            playStyle: $("#pfPlay").value,
            tags: $("#pfTags").value,
            bio: $("#pfBio").value
        };
        saveState();
        sbUpsertProfile(state.myProfile).catch(() => {});
        $("#editProfileModal").classList.add("hidden");
        renderProfile();
        flashToast("Profil gespeichert! 🐾");
    });
}

// --- Settings ---
function openSettings() {
    const s = state.settings;
    $("#setPush").checked = s.push;
    $("#setChatNotif").checked = s.chatNotif;
    $("#setMatchNotif").checked = s.matchNotif;
    $("#setDangerNotif").checked = s.dangerNotif;
    $("#setInvisible").checked = s.invisible;
    $("#setLocShare").checked = s.locShare;
    $("#setReadReceipts").checked = s.readReceipts;
    $("#setDark").checked = s.dark;
    $("#setLang").value = s.lang;
    $("#setUnit").value = s.unit;
    $("#settingsModal").classList.remove("hidden");
}
function saveSettings() {
    state.settings = {
        push:             $("#setPush").checked,
        chatNotif:        $("#setChatNotif").checked,
        matchNotif:       $("#setMatchNotif").checked,
        dangerNotif:      $("#setDangerNotif").checked,
        invisible:        $("#setInvisible").checked && state.premium,
        locShare:         $("#setLocShare").checked,
        readReceipts:     $("#setReadReceipts").checked,
        dark:             $("#setDark").checked,
        lang:             $("#setLang").value,
        unit:             $("#setUnit").value
    };
    document.documentElement.classList.toggle("dark", state.settings.dark);
    saveState();
    $("#settingsModal").classList.add("hidden");
    flashToast("⚙ Einstellungen gespeichert");
    if (leafletMap) renderMap();
}

function exportData() {
    const blob = new Blob([JSON.stringify({
        profile: state.myProfile,
        matches: state.matches.map(m => ({ id: m.profile.id, messages: m.messages })),
        settings: state.settings
    }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pfotenmatch-export.json";
    a.click();
    URL.revokeObjectURL(url);
    flashToast("📦 Daten exportiert");
}
function resetAllData() {
    if (!confirm("Wirklich ALLE lokalen Daten löschen? Dies kann nicht rückgängig gemacht werden.")) return;
    localStorage.removeItem("pfotenMatch");
    location.reload();
}

function flashToast(text) {
    $("#adText").textContent = text;
    $("#adBanner").classList.remove("hidden");
    setTimeout(() => $("#adBanner").classList.add("hidden"), 2500);
}

// ============================================================
// SITTER – Hundesitter finden & buchen
// ============================================================
const sitterUi = {
    mode: "discover",    // "discover" | "bookings"
    service: "",
    maxPrice: 25,
    detailId: null
};

const SERVICE_ICONS  = { Gassi: "🚶", Tag: "☀", Nacht: "🌙", Urlaub: "✈" };
const SERVICE_LABELS = { Gassi: "Gassi", Tag: "Tagesbetreuung", Nacht: "Übernachtung", Urlaub: "Urlaubspflege" };
function serviceIcon(s)  { return SERVICE_ICONS[s]  || "🐾"; }
function serviceLabel(s) { return SERVICE_LABELS[s] || s; }

function sitterDistance(s) {
    // Grobe Entfernung in km (Äquirektangulär, reicht für Liste)
    const a = state.userLocation;
    const dLat = (s.lat - a.lat) * 111;
    const dLng = (s.lng - a.lng) * 111 * Math.cos(a.lat * Math.PI / 180);
    return Math.sqrt(dLat * dLat + dLng * dLng);
}

function renderSitterView() {
    renderSitters();
    renderMyBookings();
    renderBecomeSitter();
    updateBookingsBadge();
    updateSitterRequestsBadge();
    switchSitterTab(sitterUi.mode);
}

function switchSitterTab(mode) {
    sitterUi.mode = mode;
    $$(".sitter-tab").forEach(t => t.classList.toggle("active", t.dataset.stab === mode));
    $("#sitterDiscover").classList.toggle("hidden", mode !== "discover");
    $("#sitterBookings").classList.toggle("hidden", mode !== "bookings");
    $("#sitterBecome").classList.toggle("hidden", mode !== "become");
}

// ---------- Koordinaten je Quartier (grob, für Karten-Pin) ----------
const HOOD_COORDS = {
    "Kleinbasel":   { lat: 47.5655, lng: 7.6040 },
    "Gundeldingen": { lat: 47.5440, lng: 7.5920 },
    "St. Johann":   { lat: 47.5700, lng: 7.5780 },
    "Bruderholz":   { lat: 47.5370, lng: 7.5830 },
    "Matthäus":     { lat: 47.5680, lng: 7.5920 },
    "Iselin":       { lat: 47.5580, lng: 7.5640 },
    "Breite":       { lat: 47.5520, lng: 7.6100 },
    "Riehen":       { lat: 47.5800, lng: 7.6500 },
    "Bachletten":   { lat: 47.5500, lng: 7.5700 }
};

function renderSitters() {
    const list = $("#sitterList");
    if (!list) return;
    list.innerHTML = "";
    // Alle Sitter inkl. eigenem Profil (falls vorhanden)
    const all = [...DOG_SITTERS];
    if (state.mySitterProfile) all.unshift(state.mySitterProfile);

    const filtered = all
        .filter(s => !sitterUi.service || s.services.includes(sitterUi.service))
        .filter(s => !s.priceHour || s.priceHour <= sitterUi.maxPrice)
        .map(s => ({ ...s, distance: sitterDistance(s) }))
        .sort((a, b) => {
            // Eigenes Profil immer oben
            if (a.id === "me") return -1;
            if (b.id === "me") return 1;
            return b.rating - a.rating;
        });

    if (filtered.length === 0) {
        list.innerHTML = `<p class="empty-state">Keine Sitter mit diesen Filtern gefunden 🐾</p>`;
        return;
    }

    filtered.forEach(s => {
        const isMe = s.id === "me";
        const card = document.createElement("div");
        card.className = "sitter-card" + (isMe ? " me-sitter" : "");
        const svcChips = s.services
            .map(svc => `<span class="svc-chip">${serviceIcon(svc)} ${serviceLabel(svc)}</span>`)
            .join("");
        let priceDisplay;
        if (s.priceHour) priceDisplay = `ab CHF ${s.priceHour}/Std`;
        else if (s.priceDay) priceDisplay = `ab CHF ${s.priceDay}/Tag`;
        else priceDisplay = `ab CHF ${s.priceNight}/Nacht`;
        const meBadge = isMe ? '<span class="me-badge">Du</span>' : '';
        card.innerHTML = `
            <div class="sc-av">${s.avatar}${s.verified ? '<span class="verified-dot">✓</span>' : ''}</div>
            <div class="sc-body">
                <div class="sc-head">
                    <strong>${escapeHtml(s.name)}${meBadge}</strong>
                    <span class="sc-rating">⭐ ${s.rating.toFixed(1)}</span>
                </div>
                <div class="sc-sub">${escapeHtml(s.neighborhood)} · ${s.distance.toFixed(1)} km · ⏱ ${s.responseTime}</div>
                <div class="sc-chips">${svcChips}</div>
                <p class="sc-bio">${escapeHtml(s.bio)}</p>
                <div class="sc-foot">
                    <span class="sc-price">${priceDisplay}</span>
                    <span class="sc-reviews">${s.reviewCount} Bew.</span>
                </div>
            </div>
        `;
        card.addEventListener("click", () => {
            if (isMe) {
                switchSitterTab("become");
            } else {
                openSitterDetail(s.id);
            }
        });
        list.appendChild(card);
    });
}

function openSitterDetail(id) {
    const s = DOG_SITTERS.find(x => x.id === id);
    if (!s) return;
    sitterUi.detailId = id;
    $("#sdAvatar").textContent = s.avatar;
    $("#sdName").textContent = s.name;
    const dist = sitterDistance(s).toFixed(1);
    $("#sdHood").textContent = `${s.neighborhood} · ${dist} km entfernt`;
    $("#sdRating").textContent = `⭐ ${s.rating.toFixed(1)}`;
    $("#sdReviews").textContent = `(${s.reviewCount} Bewertungen)`;
    $("#sdVerified").classList.toggle("hidden", !s.verified);
    $("#sdBio").textContent = s.bio;
    $("#sdResponse").textContent = s.responseTime;
    $("#sdExperience").textContent = s.experience;
    $("#sdSizes").textContent = s.acceptedSizes.join(", ");
    $("#sdAvailability").textContent = s.availability;

    const prices = $("#sdPrices");
    prices.innerHTML = "";
    const items = [];
    if (s.services.includes("Gassi")  && s.priceHour)  items.push(["🚶", "Gassi gehen",      `CHF ${s.priceHour}/Std`]);
    if (s.services.includes("Tag")    && s.priceDay)   items.push(["☀", "Tagesbetreuung",   `CHF ${s.priceDay}/Tag`]);
    if (s.services.includes("Nacht")  && s.priceNight) items.push(["🌙", "Übernachtung",     `CHF ${s.priceNight}/Nacht`]);
    if (s.services.includes("Urlaub") && s.priceNight) items.push(["✈", "Urlaubspflege",    `CHF ${s.priceNight}/Nacht`]);
    items.forEach(([icon, label, p]) => {
        const row = document.createElement("div");
        row.className = "price-row";
        row.innerHTML = `<span>${icon} ${label}</span><strong>${p}</strong>`;
        prices.appendChild(row);
    });

    $("#sitterDetailModal").classList.remove("hidden");
}

function openBookingForm() {
    const s = DOG_SITTERS.find(x => x.id === sitterUi.detailId);
    if (!s) return;
    $("#bookingSitterInfo").innerHTML = `Mit <strong>${escapeHtml(s.name)}</strong> · ${s.neighborhood}`;
    const sel = $("#bkService");
    sel.innerHTML = "";
    s.services.forEach(svc => {
        const opt = document.createElement("option");
        opt.value = svc;
        opt.textContent = `${serviceIcon(svc)} ${serviceLabel(svc)}`;
        sel.appendChild(opt);
    });
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
    $("#bkFrom").value = tomorrow;
    $("#bkTo").value = tomorrow;
    $("#bkHours").value = 2;
    $("#bkNotes").value = "";
    updateBookingFormUi();
    $("#sitterDetailModal").classList.add("hidden");
    $("#bookingModal").classList.remove("hidden");
}

function daysBetween(from, to) {
    const a = new Date(from);
    const b = new Date(to);
    return Math.round((b - a) / 86400000);
}

function computeBookingTotal(sitter, svc, from, to, hours) {
    if (svc === "Gassi")  return (parseInt(hours) || 0) * (sitter.priceHour || 0);
    if (svc === "Tag")    return Math.max(1, daysBetween(from, to) + 1) * (sitter.priceDay   || 0);
    if (svc === "Nacht" || svc === "Urlaub")
        return Math.max(1, daysBetween(from, to)) * (sitter.priceNight || 0);
    return 0;
}

function updateBookingFormUi() {
    const s = DOG_SITTERS.find(x => x.id === sitterUi.detailId);
    if (!s) return;
    const svc = $("#bkService").value;
    // Felder passend zum Service zeigen/verstecken
    const isGassi  = svc === "Gassi";
    $("#bkHoursLabel").classList.toggle("hidden", !isGassi);
    $("#bkToLabel").classList.toggle("hidden", isGassi);
    const total = computeBookingTotal(s, svc, $("#bkFrom").value, $("#bkTo").value, $("#bkHours").value);
    $("#bkTotal").textContent = `CHF ${total}`;
}

function submitBooking() {
    const s = DOG_SITTERS.find(x => x.id === sitterUi.detailId);
    if (!s) return;
    const svc = $("#bkService").value;
    const from = $("#bkFrom").value;
    const to   = $("#bkTo").value;
    const hours = parseInt($("#bkHours").value) || 0;
    const notes = $("#bkNotes").value.trim();
    if (!from) { flashToast("Bitte Datum wählen"); return; }
    if (svc === "Gassi" && hours < 1) { flashToast("Bitte Stundenzahl angeben"); return; }

    const total = computeBookingTotal(s, svc, from, to, hours);
    const booking = {
        id: "bk" + Date.now(),
        sitterId: s.id,
        service: svc,
        dateFrom: from,
        dateTo: svc === "Gassi" ? from : to,
        hours: hours,
        notes: notes,
        total: total,
        status: "pending",
        ts: Date.now()
    };
    state.bookings.unshift(booking);
    saveState();
    $("#bookingModal").classList.add("hidden");
    flashToast(`📨 Anfrage an ${s.name} gesendet`);
    updateBookingsBadge();
    if (sitterUi.mode === "bookings") renderMyBookings();

    // Simulierte Sitter-Antwort nach 4–7 Sekunden
    setTimeout(() => {
        const b = state.bookings.find(x => x.id === booking.id);
        if (!b || b.status !== "pending") return;
        b.status = Math.random() < 0.85 ? "confirmed" : "declined";
        saveState();
        if (b.status === "confirmed") {
            flashToast(`✅ ${s.name} hat deine Anfrage bestätigt!`);
        } else {
            flashToast(`😔 ${s.name} ist an dem Termin leider nicht verfügbar`);
        }
        if ($("#view-sitter")?.classList.contains("active")) renderMyBookings();
        updateBookingsBadge();
    }, 4000 + Math.random() * 3000);
}

function renderMyBookings() {
    const list = $("#bookingList");
    if (!list) return;
    if (state.bookings.length === 0) {
        list.innerHTML = `<p class="empty-state">Noch keine Buchungen. Finde einen Sitter und sende deine erste Anfrage! 🐾</p>`;
        return;
    }
    list.innerHTML = "";
    state.bookings.forEach(b => {
        const s = DOG_SITTERS.find(x => x.id === b.sitterId);
        if (!s) return;
        const statusText = ({
            pending:   "⏳ Wartet auf Bestätigung",
            confirmed: "✅ Bestätigt",
            declined:  "❌ Abgelehnt",
            completed: "🏁 Abgeschlossen"
        })[b.status] || b.status;
        const detail = b.service === "Gassi"
            ? `${b.hours} Std am ${b.dateFrom}`
            : (b.dateFrom === b.dateTo ? b.dateFrom : `${b.dateFrom} – ${b.dateTo}`);
        const card = document.createElement("div");
        card.className = `booking-card status-${b.status}`;
        card.innerHTML = `
            <div class="bc-av">${s.avatar}</div>
            <div class="bc-body">
                <div class="bc-head">
                    <strong>${escapeHtml(s.name)}</strong>
                    <span class="bc-total">CHF ${b.total}</span>
                </div>
                <div class="bc-sub">${serviceIcon(b.service)} ${serviceLabel(b.service)} · ${escapeHtml(detail)}</div>
                <div class="bc-status">${statusText}</div>
            </div>
            <button class="bc-cancel" data-cancel="${b.id}" title="Stornieren">✕</button>
        `;
        card.querySelector(".bc-cancel").addEventListener("click", (e) => {
            e.stopPropagation();
            cancelBooking(b.id);
        });
        list.appendChild(card);
    });
}

function updateBookingsBadge() {
    const pending = state.bookings.filter(b => b.status === "pending" || b.status === "confirmed").length;
    const badge = $("#bookingsBadge");
    if (!badge) return;
    if (pending > 0) {
        badge.textContent = pending;
        badge.classList.remove("hidden");
    } else {
        badge.classList.add("hidden");
    }
}

function cancelBooking(id) {
    if (!confirm("Buchung wirklich stornieren?")) return;
    state.bookings = state.bookings.filter(b => b.id !== id);
    saveState();
    renderMyBookings();
    updateBookingsBadge();
    flashToast("🗑 Buchung storniert");
}

// ============================================================
// "SITTER WERDEN" – Registrierung, Dashboard, Anfragen
// ============================================================

const sitterForm = { selectedAvatar: "👩", selectedSizes: [] };

function renderBecomeSitter() {
    const hasProfile = !!state.mySitterProfile;
    const regWrap = $("#sitterRegisterWrap");
    const dashWrap = $("#sitterDashboardWrap");
    if (!regWrap || !dashWrap) return;
    regWrap.classList.toggle("hidden", hasProfile);
    dashWrap.classList.toggle("hidden", !hasProfile);
    if (hasProfile) {
        renderSitterDashboard();
    } else {
        // Formular-Defaults setzen
        initSitterFormDefaults();
    }
}

function initSitterFormDefaults() {
    // Avatar-Picker aktiv-Markierung
    const avPicker = $("#msAvatarPicker");
    if (avPicker) {
        $$("#msAvatarPicker button").forEach(b => {
            b.classList.toggle("active", b.dataset.av === sitterForm.selectedAvatar);
        });
    }
    // Size-Picker aktiv
    $$("#msSizes button").forEach(b => {
        b.classList.toggle("active", sitterForm.selectedSizes.includes(b.dataset.size));
    });
}

function bindSitterRegistration() {
    // Avatar-Picker
    $$("#msAvatarPicker button").forEach(b => {
        b.addEventListener("click", () => {
            sitterForm.selectedAvatar = b.dataset.av;
            $$("#msAvatarPicker button").forEach(x => x.classList.toggle("active", x === b));
        });
    });
    // Größen-Picker (Multi-Select)
    $$("#msSizes button").forEach(b => {
        b.addEventListener("click", () => {
            const size = b.dataset.size;
            const idx = sitterForm.selectedSizes.indexOf(size);
            if (idx >= 0) sitterForm.selectedSizes.splice(idx, 1);
            else sitterForm.selectedSizes.push(size);
            b.classList.toggle("active");
        });
    });
    // Formular-Submit
    $("#sitterForm")?.addEventListener("submit", (e) => {
        e.preventDefault();
        saveMySitterProfile();
    });
    // Dashboard
    $("#dashEditBtn")?.addEventListener("click", editMySitterProfile);
    $("#dashDeleteBtn")?.addEventListener("click", deleteMySitterProfile);
}

function saveMySitterProfile() {
    const name = $("#msName").value.trim();
    const hood = $("#msHood").value;
    const bio  = $("#msBio").value.trim();
    const experience = $("#msExperience").value;
    const responseTime = $("#msResponse").value;
    const availability = $("#msAvailability").value.trim() || "Nach Absprache";
    const phoneVerified = $("#msPhoneVerify").checked;

    const services = [];
    $$('input[name="msSvc"]:checked').forEach(i => services.push(i.value));

    if (!name)    { flashToast("Bitte Namen eingeben"); return; }
    if (!bio)     { flashToast("Bitte eine kurze Bio schreiben"); return; }
    if (services.length === 0) { flashToast("Wähle mindestens einen Service"); return; }
    if (sitterForm.selectedSizes.length === 0) { flashToast("Wähle mindestens eine Hundegröße"); return; }

    const priceHour  = parseInt($("#msPriceHour").value)  || null;
    const priceDay   = parseInt($("#msPriceDay").value)   || null;
    const priceNight = parseInt($("#msPriceNight").value) || null;

    if (services.includes("Gassi") && !priceHour)  { flashToast("Bitte Stundenpreis für Gassi angeben"); return; }
    if (services.includes("Tag")   && !priceDay)   { flashToast("Bitte Tagespreis angeben"); return; }
    if ((services.includes("Nacht") || services.includes("Urlaub")) && !priceNight) {
        flashToast("Bitte Nachtpreis angeben"); return;
    }

    const coords = HOOD_COORDS[hood] || { lat: state.userLocation.lat, lng: state.userLocation.lng };

    const isNew = !state.mySitterProfile;
    state.mySitterProfile = {
        id: "me",
        name,
        avatar: sitterForm.selectedAvatar,
        neighborhood: hood,
        lat: coords.lat, lng: coords.lng,
        rating: state.mySitterProfile?.rating || 5.0,
        reviewCount: state.mySitterProfile?.reviewCount || 0,
        priceHour, priceDay, priceNight,
        services,
        bio,
        experience,
        verified: phoneVerified,
        acceptedSizes: [...sitterForm.selectedSizes],
        responseTime,
        availability,
        createdAt: state.mySitterProfile?.createdAt || Date.now()
    };
    saveState();

    if (isNew) {
        flashToast("🎉 Sitter-Profil veröffentlicht!");
        // Demo-Anfragen nach kurzer Verzögerung einspielen
        setTimeout(seedDemoSitterRequests, 1500);
    } else {
        flashToast("✓ Profil aktualisiert");
    }

    renderBecomeSitter();
    renderSitters();      // eigenes Profil im Entdecken-Tab zeigen
    updateSitterRequestsBadge();
    if (leafletMap) renderMapMarkers();
}

function editMySitterProfile() {
    const p = state.mySitterProfile;
    if (!p) return;
    // Formular mit vorhandenen Werten befüllen
    $("#msName").value = p.name;
    $("#msHood").value = p.neighborhood;
    $("#msBio").value = p.bio;
    $("#msExperience").value = p.experience;
    $("#msResponse").value = p.responseTime;
    $("#msAvailability").value = p.availability;
    $("#msPhoneVerify").checked = !!p.verified;
    $("#msPriceHour").value  = p.priceHour  || "";
    $("#msPriceDay").value   = p.priceDay   || "";
    $("#msPriceNight").value = p.priceNight || "";
    $$('input[name="msSvc"]').forEach(i => {
        i.checked = p.services.includes(i.value);
    });
    sitterForm.selectedAvatar = p.avatar;
    sitterForm.selectedSizes = [...p.acceptedSizes];
    initSitterFormDefaults();

    // Während Bearbeitung: Dashboard ausblenden, Formular zeigen
    $("#sitterRegisterWrap").classList.remove("hidden");
    $("#sitterDashboardWrap").classList.add("hidden");
    $("#sitterRegisterWrap").scrollIntoView({ behavior: "smooth" });
}

function deleteMySitterProfile() {
    if (!confirm("Sitter-Profil wirklich löschen? Alle offenen Anfragen gehen verloren.")) return;
    state.mySitterProfile = null;
    state.sitterRequests = [];
    sitterForm.selectedAvatar = "👩";
    sitterForm.selectedSizes = [];
    // Form leeren
    const form = $("#sitterForm");
    if (form) form.reset();
    saveState();
    renderBecomeSitter();
    renderSitters();
    updateSitterRequestsBadge();
    flashToast("🗑 Profil gelöscht");
    if (leafletMap) renderMapMarkers();
}

// ---------- Demo-Anfragen von (simulierten) Kunden ----------
const DEMO_REQUEST_NAMES = [
    { name: "Sarah", dog: "Mochi",   emoji: "🐕",    size: "Klein",  note: "Mochi ist sehr anhänglich und braucht viel Kuscheleinheiten." },
    { name: "David", dog: "Zeus",    emoji: "🦮",    size: "Groß",   note: "Zeus ist trainiert, zieht aber an der Leine. Geht das?" },
    { name: "Nina",  dog: "Pepper",  emoji: "🐩",    size: "Klein",  note: "Wir gehen diese Woche ins Wochenende." },
    { name: "Tim",   dog: "Loki",    emoji: "🐕‍🦺", size: "Mittel", note: "Loki ist manchmal ängstlich vor großen Hunden." },
    { name: "Jana",  dog: "Nala",    emoji: "🐶",    size: "Mittel", note: "Brauche dringend jemanden ab morgen früh." }
];

function seedDemoSitterRequests() {
    if (!state.mySitterProfile) return;
    const count = 2 + Math.floor(Math.random() * 2); // 2–3
    const picks = [...DEMO_REQUEST_NAMES].sort(() => 0.5 - Math.random()).slice(0, count);
    picks.forEach((p, i) => {
        const svc = state.mySitterProfile.services[
            Math.floor(Math.random() * state.mySitterProfile.services.length)
        ];
        const hours = svc === "Gassi" ? 1 + Math.floor(Math.random() * 3) : 0;
        const from = new Date(Date.now() + (i + 1) * 86400000).toISOString().split("T")[0];
        const total = computeRequestTotal(state.mySitterProfile, svc, hours);
        state.sitterRequests.unshift({
            id: "req" + Date.now() + "_" + i,
            fromName: p.name,
            dogName: p.dog,
            dogEmoji: p.emoji,
            dogSize: p.size,
            service: svc,
            date: from,
            hours,
            message: p.note,
            total,
            status: "pending",
            ts: Date.now() - i * 60000
        });
    });
    saveState();
    renderSitterDashboard();
    updateSitterRequestsBadge();
    flashToast(`📥 ${count} neue Anfragen!`);
}

function computeRequestTotal(sitter, svc, hours) {
    if (svc === "Gassi")  return (hours || 0) * (sitter.priceHour || 0);
    if (svc === "Tag")    return sitter.priceDay || 0;
    if (svc === "Nacht" || svc === "Urlaub") return sitter.priceNight || 0;
    return 0;
}

function renderSitterDashboard() {
    const p = state.mySitterProfile;
    if (!p) return;
    $("#dashAv").textContent = p.avatar;
    $("#dashName").textContent = p.name;
    $("#dashHood").textContent = `${p.neighborhood} · ${p.services.length} Services`;
    $("#dashVerified").classList.toggle("hidden", !p.verified);
    $("#dashRating").textContent = (p.rating || 5.0).toFixed(1);

    // Stats: Verdienst + Aufträge (nur accepted/completed)
    const done = state.sitterRequests.filter(r => r.status === "accepted" || r.status === "completed");
    const earnings = done.reduce((sum, r) => sum + (r.total || 0), 0);
    $("#dashEarnings").textContent = `CHF ${earnings}`;
    $("#dashJobs").textContent = String(done.length);

    // Anfragen-Liste (pending zuerst)
    const reqList = $("#sitterRequestsList");
    const pending = state.sitterRequests.filter(r => r.status === "pending");
    if (pending.length === 0) {
        reqList.innerHTML = `<p class="empty-mini">Noch keine offenen Anfragen. 🐾</p>`;
    } else {
        reqList.innerHTML = "";
        pending.forEach(r => {
            const card = document.createElement("div");
            card.className = "req-card";
            const detail = r.service === "Gassi"
                ? `${r.hours} Std am ${r.date}`
                : r.date;
            card.innerHTML = `
                <div class="req-head">
                    <span class="req-av">${r.dogEmoji}</span>
                    <div class="req-meta">
                        <strong>${escapeHtml(r.fromName)} &amp; ${escapeHtml(r.dogName)}</strong>
                        <small>${serviceIcon(r.service)} ${serviceLabel(r.service)} · ${r.dogSize} · ${escapeHtml(detail)}</small>
                    </div>
                    <span class="req-total">CHF ${r.total}</span>
                </div>
                <p class="req-msg">"${escapeHtml(r.message)}"</p>
                <div class="req-actions">
                    <button class="btn-ghost" data-decline="${r.id}">Ablehnen</button>
                    <button class="btn-primary" data-accept="${r.id}">Annehmen ✓</button>
                </div>
            `;
            card.querySelector("[data-accept]").addEventListener("click", () => acceptSitterRequest(r.id));
            card.querySelector("[data-decline]").addEventListener("click", () => declineSitterRequest(r.id));
            reqList.appendChild(card);
        });
    }

    // Aufträge (accepted + completed + declined)
    const jobsList = $("#sitterJobsList");
    const others = state.sitterRequests.filter(r => r.status !== "pending");
    if (others.length === 0) {
        jobsList.innerHTML = `<p class="empty-mini">Noch keine bearbeiteten Aufträge.</p>`;
    } else {
        jobsList.innerHTML = "";
        others.forEach(r => {
            const statusText = ({
                accepted:  "✅ Angenommen",
                completed: "🏁 Abgeschlossen",
                declined:  "❌ Abgelehnt"
            })[r.status] || r.status;
            const row = document.createElement("div");
            row.className = `job-row status-${r.status}`;
            row.innerHTML = `
                <span>${r.dogEmoji}</span>
                <div class="job-meta">
                    <strong>${escapeHtml(r.fromName)} &amp; ${escapeHtml(r.dogName)}</strong>
                    <small>${serviceLabel(r.service)} · ${escapeHtml(r.date)} · ${statusText}</small>
                </div>
                <strong class="job-total">CHF ${r.total}</strong>
            `;
            jobsList.appendChild(row);
        });
    }
}

function acceptSitterRequest(id) {
    const r = state.sitterRequests.find(x => x.id === id);
    if (!r) return;
    r.status = "accepted";
    saveState();
    renderSitterDashboard();
    updateSitterRequestsBadge();
    flashToast(`✅ ${r.fromName} wurde angenommen`);
    // Nach 6–10 s automatisch als "completed" markieren (simuliert)
    setTimeout(() => {
        const still = state.sitterRequests.find(x => x.id === id);
        if (still && still.status === "accepted") {
            still.status = "completed";
            // Rating leicht anheben (max 5.0)
            if (state.mySitterProfile) {
                state.mySitterProfile.reviewCount = (state.mySitterProfile.reviewCount || 0) + 1;
            }
            saveState();
            if ($("#view-sitter")?.classList.contains("active") && sitterUi.mode === "become") {
                renderSitterDashboard();
            }
            flashToast(`⭐ ${r.fromName} hat dich bewertet!`);
        }
    }, 6000 + Math.random() * 4000);
}

function declineSitterRequest(id) {
    const r = state.sitterRequests.find(x => x.id === id);
    if (!r) return;
    r.status = "declined";
    saveState();
    renderSitterDashboard();
    updateSitterRequestsBadge();
    flashToast(`Anfrage von ${r.fromName} abgelehnt`);
}

function updateSitterRequestsBadge() {
    const badge = $("#sitterRequestsBadge");
    if (!badge) return;
    const pending = state.sitterRequests.filter(r => r.status === "pending").length;
    if (pending > 0) {
        badge.textContent = pending;
        badge.classList.remove("hidden");
    } else {
        badge.classList.add("hidden");
    }
}

// ---------- Event bindings ----------
function bindEvents() {
    // Nav
    $$(".nav-btn").forEach(b => {
        b.addEventListener("click", () => switchView(b.dataset.view));
    });
    // Action buttons
    $("#btnLike").addEventListener("click", () => {
        const card = $("#cardStack .dog-card:last-child");
        if (!card) return;
        const dog = state.profiles[state.currentIdx];
        if (dog) flyAway(card, dog, "like");
    });
    $("#btnPass").addEventListener("click", () => {
        const card = $("#cardStack .dog-card:last-child");
        if (!card) return;
        const dog = state.profiles[state.currentIdx];
        if (dog) flyAway(card, dog, "pass");
    });
    $("#btnSuper").addEventListener("click", () => {
        if (!state.premium) return openPremium();
        const dog = state.profiles[state.currentIdx];
        if (!dog) return;
        const card = $("#cardStack .dog-card:last-child");
        if (card) flyAway(card, dog, "super");
    });
    // Locate button
    $("#locateBtn")?.addEventListener("click", locateUser);
    // --- Filter Bottom-Sheet ---
    bindFilterSheet();
    // Match modal
    $("#keepSwipingBtn").addEventListener("click", () => $("#matchModal").classList.add("hidden"));
    // Chat modal
    $("#chatBack").addEventListener("click", () => {
        resetChatUi();
        sbUnsubscribeMessages();
        sbUnsubscribeChatMessages();
        state.activeChatId = null;
        $("#chatModal").classList.add("hidden");
        renderMatches();
    });
    $("#chatForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const inp = $("#chatInput");
        if (!inp.value.trim()) return;
        sendMessage(inp.value);
        inp.value = "";
        toggleSendButton();
    });
    // Input umschalten: voice ↔ senden
    $("#chatInput").addEventListener("input", toggleSendButton);

    // Anhang-Menü
    $("#attachBtn").addEventListener("click", () => {
        $("#attachMenu").classList.toggle("hidden");
    });
    $$("#attachMenu button").forEach(btn => {
        btn.addEventListener("click", () => {
            const kind = btn.dataset.attach;
            $("#attachMenu").classList.add("hidden");
            if (kind === "photo") {
                pickPhoto();
            } else if (kind === "location") {
                sendLocation();
            } else if (kind === "meet") {
                const match = state.matches.find(m => m.profile.id === state.activeChatId);
                if (match) openMeetPlanner(match.profile);
            }
        });
    });
    // Echter Foto-Upload
    $("#photoInput").addEventListener("change", (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) handlePhotoFile(file);
        e.target.value = ""; // reset, damit dieselbe Datei nochmal geschickt werden kann
    });
    // Voice
    $("#voiceBtn").addEventListener("click", startVoiceRecording);
    $("#voiceCancelBtn").addEventListener("click", () => stopVoiceRecording(false));
    $("#voiceSendBtn").addEventListener("click", () => stopVoiceRecording(true));
    // Reply cancel
    $("#cancelReplyBtn").addEventListener("click", cancelReply);
    // Chat-Menü
    $("#chatMenuBtn").addEventListener("click", () => $("#chatMenuModal").classList.remove("hidden"));
    $("#closeChatMenuBtn").addEventListener("click", () => $("#chatMenuModal").classList.add("hidden"));
    $("#chatSearchBtn").addEventListener("click", () => {
        $("#chatMenuModal").classList.add("hidden");
        $("#chatSearchInput").value = "";
        $("#chatSearchResults").innerHTML = "";
        $("#chatSearchModal").classList.remove("hidden");
        setTimeout(() => $("#chatSearchInput").focus(), 100);
    });
    $("#chatSearchInput").addEventListener("input", (e) => runChatSearch(e.target.value));
    $("#closeSearchBtn").addEventListener("click", () => $("#chatSearchModal").classList.add("hidden"));
    $("#chatMuteBtn").addEventListener("click", toggleMuteChat);
    $("#chatClearBtn").addEventListener("click", () => {
        clearChatHistory();
        $("#chatMenuModal").classList.add("hidden");
    });
    $("#chatBlockBtn").addEventListener("click", blockCurrentChat);
    // Kontextmenü
    $$("#msgContextMenu button").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = chatUi.contextMsgId;
            closeMsgContextMenu();
            if (!id) return;
            const action = btn.dataset.action;
            if (action === "reply")  startReplyTo(id);
            if (action === "copy")   copyMessage(id);
            if (action === "delete") deleteMessage(id);
            if (action === "react") {
                chatUi.contextMsgId = id; // für reactionPicker merken
                $("#reactionPicker").classList.remove("hidden");
            }
        });
    });
    // Reaction Picker
    $$("#reactionPicker button").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = chatUi.contextMsgId;
            $("#reactionPicker").classList.add("hidden");
            if (id) addReaction(id, btn.dataset.react);
            chatUi.contextMsgId = null;
        });
    });
    // Premium
    $("#premiumBadge").addEventListener("click", openPremium);
    $("#buyPremiumBtn").addEventListener("click", activatePremium);
    $("#closePremiumBtn").addEventListener("click", () => $("#premiumModal").classList.add("hidden"));
    // Meet
    $("#cancelMeetBtn").addEventListener("click", () => $("#meetModal").classList.add("hidden"));
    // Gefahren-Radar
    $("#reportDangerBtn")?.addEventListener("click", openDangerReport);
    $("#cancelDangerBtn")?.addEventListener("click", () => $("#dangerModal").classList.add("hidden"));
    $("#saveDangerBtn")?.addEventListener("click", saveDangerReport);
    // --- Profile page ---
    $("#profileAvatarBtn").addEventListener("click", () => {
        if (hasActiveStory("me")) {
            openStoryViewer("me");
        } else {
            $("#profileMenuModal").classList.remove("hidden");
        }
    });
    $("#profileMenuOpenBtn").addEventListener("click", () => {
        $("#profileMenuModal").classList.remove("hidden");
    });
    $("#closeProfileMenuBtn").addEventListener("click", () => {
        $("#profileMenuModal").classList.add("hidden");
    });
    $$("#profileMenuModal .sheet-item").forEach(btn => {
        btn.addEventListener("click", () => {
            const kind = btn.dataset.menu;
            $("#profileMenuModal").classList.add("hidden");
            if (kind === "edit")      openEditProfile();
            if (kind === "avatar")    $("#avatarInput").click();
            if (kind === "story")     $("#storyInput").click();
            if (kind === "viewStory") openStoryViewer("me");
            if (kind === "addPhoto")  $("#galleryInput").click();
            if (kind === "settings")  openSettings();
            if (kind === "premium")   openPremium();
            if (kind === "help")      flashToast("💌 Feedback an hallo@pfotenmatch.app");
            if (kind === "logout") {
                if (confirm("Wirklich abmelden? Deine lokalen Daten bleiben erhalten.")) {
                    sbSignOut().then(() => {
                        state.onboarded = false;
                        saveState();
                        flashToast("👋 Abgemeldet");
                        showOnboarding();
                    }).catch(() => {
                        flashToast("👋 Abgemeldet");
                        state.onboarded = false;
                        saveState();
                        showOnboarding();
                    });
                }
            }
        });
    });
    $("#editProfileBtn").addEventListener("click", openEditProfile);
    $("#shareProfileBtn").addEventListener("click", openShareProfileModal);
    $("#closeShareProfileBtn").addEventListener("click", () => $("#shareProfileModal").classList.add("hidden"));
    $("#copyCodeBtn").addEventListener("click", () => {
        const code = $("#myFriendCode").textContent;
        if (navigator.clipboard) navigator.clipboard.writeText(code).then(() => flashToast("📋 Code kopiert!")).catch(() => {});
    });
    $("#shareCodeBtn").addEventListener("click", () => {
        const code = $("#myFriendCode").textContent;
        const p = state.myProfile;
        const txt = `Verbinde dich mit ${p.name} auf PfotenMatch! 🐾 Dein Code: ${code}`;
        if (navigator.share) {
            navigator.share({ title: "PfotenMatch", text: txt }).catch(() => {});
        } else {
            if (navigator.clipboard) navigator.clipboard.writeText(txt).catch(() => {});
            flashToast("🔗 In Zwischenablage kopiert");
        }
    });
    // Connect friend
    $("#connectFriendBtn").addEventListener("click", () => {
        $("#friendCodeInput").value = "";
        $("#friendLookupResult").classList.add("hidden");
        $("#connectFriendModal").classList.remove("hidden");
        setTimeout(() => $("#friendCodeInput").focus(), 100);
    });
    $("#cancelConnectBtn").addEventListener("click", () => $("#connectFriendModal").classList.add("hidden"));
    $("#confirmConnectBtn").addEventListener("click", connectFriendByCode);
    $("#friendCodeInput").addEventListener("input", (e) => {
        let v = e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
        if (v.length > 4) v = v.slice(0, 4) + "-" + v.slice(4, 8);
        e.target.value = v;
    });
    $("#cancelEditProfileBtn").addEventListener("click", () => {
        $("#editProfileModal").classList.add("hidden");
    });
    // Profile-Tabs
    $$(".profile-tab").forEach(b => {
        b.addEventListener("click", () => switchProfileTab(b.dataset.ptab));
    });
    // Foto-Upload (Galerie)
    $("#addPhotoBtn").addEventListener("click", () => $("#galleryInput").click());
    $("#galleryInput").addEventListener("change", (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) handleGalleryFile(file);
        e.target.value = "";
    });
    // Profilbild-Upload
    $("#avatarInput").addEventListener("change", (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) handleAvatarFile(file);
        e.target.value = "";
    });
    // Story-Upload
    $("#storyInput").addEventListener("change", (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) handleStoryFile(file);
        e.target.value = "";
    });
    // Story viewer
    $("#storyClose").addEventListener("click", closeStoryViewer);
    $("#storyDelete").addEventListener("click", deleteCurrentStory);
    $("#storyTapLeft").addEventListener("click", () => advanceStory(-1));
    $("#storyTapRight").addEventListener("click", () => advanceStory(1));
    // Photo viewer
    $("#photoViewerClose").addEventListener("click", () => $("#photoViewerModal").classList.add("hidden"));
    $("#photoViewerDelete").addEventListener("click", deleteCurrentPhoto);
    // Settings
    $("#closeSettingsBtn").addEventListener("click", saveSettings);
    $("#exportDataBtn").addEventListener("click", exportData);
    $("#resetDataBtn").addEventListener("click", resetAllData);
    $("#deleteAccountBtn").addEventListener("click", () => {
        if (confirm("Account wirklich löschen? Alle Daten gehen verloren.")) {
            localStorage.removeItem("pfotenMatch");
            location.reload();
        }
    });
    // Ad close
    $("#adClose").addEventListener("click", () => $("#adBanner").classList.add("hidden"));
    // --- Sitter tab ---
    $$(".sitter-tab").forEach(t => {
        t.addEventListener("click", () => switchSitterTab(t.dataset.stab));
    });
    $$("#serviceChips .chip").forEach(c => {
        c.addEventListener("click", () => {
            $$("#serviceChips .chip").forEach(x => x.classList.remove("active"));
            c.classList.add("active");
            sitterUi.service = c.dataset.svc || "";
            renderSitters();
        });
    });
    $("#maxPriceSlider").addEventListener("input", (e) => {
        sitterUi.maxPrice = parseInt(e.target.value);
        $("#maxPriceLabel").textContent = `CHF ${sitterUi.maxPrice}`;
        renderSitters();
    });
    $("#sitterDetailClose").addEventListener("click", () =>
        $("#sitterDetailModal").classList.add("hidden"));
    $("#sdBookBtn").addEventListener("click", openBookingForm);
    // Booking form
    $("#bkService").addEventListener("change", updateBookingFormUi);
    $("#bkFrom").addEventListener("change", updateBookingFormUi);
    $("#bkTo").addEventListener("change", updateBookingFormUi);
    $("#bkHours").addEventListener("input", updateBookingFormUi);
    $("#bkCancel").addEventListener("click", () =>
        $("#bookingModal").classList.add("hidden"));
    $("#bkSubmit").addEventListener("click", submitBooking);
    // Close modals on backdrop click
    $$(".modal").forEach(m => {
        m.addEventListener("click", (e) => {
            if (e.target === m) m.classList.add("hidden");
        });
    });
}

// ============================================================
// ONBOARDING
// ============================================================
const onb = {
    step: 0,
    total: 7,
    authMethod: null,
    draft: {
        name: "",
        breed: "",
        age: 3,
        size: "Mittel (10–25kg)",
        neutered: "Nein",
        energy: "Ausgeglichen 🐾",
        playStyle: "Rennend 🏃",
        bio: "",
        emoji: "🐕",
        avatarImage: null,
        city: "Basel",
        location: { lat: 47.5585, lng: 7.5880 }
    }
};

const CITY_COORDS = {
    "Basel":    { lat: 47.5585, lng: 7.5880 },
    "Zürich":   { lat: 47.3769, lng: 8.5417 },
    "Bern":     { lat: 46.9481, lng: 7.4474 },
    "Genf":     { lat: 46.2044, lng: 6.1432 },
    "Lausanne": { lat: 46.5197, lng: 6.6323 },
    "Luzern":   { lat: 47.0502, lng: 8.3093 }
};

function showOnboarding() {
    $("#onboarding").classList.remove("hidden");
    // App-Header ausblenden während Onboarding
    document.body.style.overflow = "hidden";
    onbGoto(0);
    runTypewriter();
}

function hideOnboarding() {
    $("#onboarding").classList.add("hidden");
    document.body.style.overflow = "";
}

function onbGoto(step) {
    onb.step = step;
    $$(".onb-step").forEach(el => {
        el.hidden = parseInt(el.dataset.step) !== step;
    });
    const pct = Math.round((step / (onb.total)) * 100);
    $("#onbProgressBar").style.width = pct + "%";
    // Smooth scroll to top der Stage
    $("#onboarding").scrollTo({ top: 0, behavior: "smooth" });
}

function onbNext() {
    if (!onbValidateStep(onb.step)) return;
    if (onb.step < onb.total) onbGoto(onb.step + 1);
    if (onb.step === onb.total) renderDoneSummary();
}
function onbPrev() {
    if (onb.step > 0) onbGoto(onb.step - 1);
}

function onbValidateStep(step) {
    if (step === 2) {
        const name = $("#onbName").value.trim();
        if (!name) {
            flashToast("🐶 Bitte gib deinem Hund einen Namen");
            $("#onbName").focus();
            return false;
        }
        onb.draft.name = name;
    }
    if (step === 3) {
        onb.draft.breed = $("#onbBreed").value.trim() || "Mischling";
        onb.draft.age = parseInt($("#onbAge").value) || 0;
    }
    if (step === 5) {
        onb.draft.bio = $("#onbBio").value.trim();
    }
    return true;
}

// --- Typewriter on step 0 ---
const TYPE_LINES = [
    "Finde den perfekten Spielkameraden für deinen Hund.",
    "Entdecke Parks, Hundewiesen und Cafés in der Nähe.",
    "Plane Treffen direkt im Chat — ganz einfach.",
    "Für glücklichere Hunde. Und Menschen. 🐾"
];
let typeTimer = null;
function runTypewriter() {
    if (typeTimer) { clearTimeout(typeTimer); typeTimer = null; }
    const el = $("#typewriter");
    if (!el) return;
    let lineIdx = 0, charIdx = 0, deleting = false;
    function tick() {
        const line = TYPE_LINES[lineIdx];
        if (!deleting) {
            charIdx++;
            el.textContent = line.slice(0, charIdx);
            if (charIdx >= line.length) {
                deleting = true;
                typeTimer = setTimeout(tick, 1800);
                return;
            }
        } else {
            charIdx--;
            el.textContent = line.slice(0, charIdx);
            if (charIdx <= 0) {
                deleting = false;
                lineIdx = (lineIdx + 1) % TYPE_LINES.length;
            }
        }
        typeTimer = setTimeout(tick, deleting ? 25 : 45);
    }
    tick();
}

// --- Auth step ---
let _pendingVerifyEmail = "";

function showAuthMode(mode) {
    $("#authRegisterMode").classList.toggle("hidden", mode !== "register");
    $("#authLoginMode").classList.toggle("hidden", mode !== "login");
    $("#authVerifyMode").classList.toggle("hidden", mode !== "verify");
}

function updatePwStrength(inputEl, barEl) {
    const v = inputEl.value;
    let score = 0;
    if (v.length >= 6)  score++;
    if (v.length >= 10) score++;
    if (/[A-Z]/.test(v)) score++;
    if (/[0-9]/.test(v)) score++;
    if (/[^A-Za-z0-9]/.test(v)) score++;
    const pcts   = ["0%", "20%", "40%", "60%", "80%", "100%"];
    const colors = ["transparent", "#e74c3c", "#f39c12", "#f1c40f", "#4ecdc4", "#27ae60"];
    barEl.style.setProperty("--pw",       pcts[score]);
    barEl.style.setProperty("--pw-color", colors[score]);
}

async function handleOAuth(provider) {
    try {
        await sbSignInWithOAuth(provider);
    } catch (err) {
        const label = provider === "google" ? "Google" : "Apple";
        flashToast(`${label}-Login fehlgeschlagen: ${err.message || "Bitte versuche es erneut."}`);
    }
}

async function handleEmailRegister() {
    const email = $("#regEmail").value.trim();
    const pass  = $("#regPass").value;
    const errEl = $("#regError");
    errEl.classList.add("hidden");
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
        flashToast("Bitte eine gültige E-Mail eingeben");
        return;
    }
    if (pass.length < 6) {
        flashToast("Passwort mindestens 6 Zeichen");
        return;
    }
    const btn = $("#regSubmitBtn");
    const origText = btn.textContent;
    btn.textContent = "Bitte warten…";
    btn.disabled = true;
    try {
        const data = await sbSignUp(email, pass);
        const needsConfirmation = data?.user && !data.user.email_confirmed_at && (!data.session);
        if (needsConfirmation) {
            _pendingVerifyEmail = email;
            $("#verifyEmailDisplay").textContent = email;
            showAuthMode("verify");
        } else {
            flashToast("Account erstellt");
            onbGoto(2);
        }
    } catch (err) {
        errEl.textContent = err.message || "Fehler bei der Registrierung";
        errEl.classList.remove("hidden");
    } finally {
        btn.textContent = origText;
        btn.disabled = false;
    }
}

async function handleEmailLogin() {
    const email = $("#loginEmail").value.trim();
    const pass  = $("#loginPass").value;
    const errEl = $("#loginError");
    errEl.classList.add("hidden");
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
        flashToast("Bitte eine gültige E-Mail eingeben");
        return;
    }
    if (pass.length < 6) {
        flashToast("Passwort mindestens 6 Zeichen");
        return;
    }
    const btn = $("#loginSubmitBtn");
    const origText = btn.textContent;
    btn.textContent = "Bitte warten…";
    btn.disabled = true;
    try {
        await sbSignIn(email, pass);
        await handlePostLogin();
    } catch (err) {
        errEl.textContent = err.message || "Fehler beim Einloggen";
        errEl.classList.remove("hidden");
    } finally {
        btn.textContent = origText;
        btn.disabled = false;
    }
}

async function handlePostLogin() {
    flashToast("Erfolgreich eingeloggt");
    const profile = await sbLoadProfile();
    if (profile) {
        Object.assign(state.myProfile, profile);
        state.onboarded = true;
        await syncFromSupabase();
        saveState();
        hideOnboarding();
        applyFilters();
        renderMatches();
        renderProfile();
    } else {
        onbGoto(2);
    }
}

async function handleVerifyLogin() {
    showAuthMode("login");
    if (_pendingVerifyEmail) {
        $("#loginEmail").value = _pendingVerifyEmail;
        $("#loginEmailForm").classList.remove("hidden");
        $("#loginEmail").focus();
    }
}

async function handleResendVerification() {
    if (!_pendingVerifyEmail) return;
    const btn = $("#verifyResendBtn");
    btn.disabled = true;
    btn.textContent = "Wird gesendet…";
    try {
        await sbResendConfirmation(_pendingVerifyEmail);
        flashToast("Bestätigungs-E-Mail erneut gesendet");
    } catch (err) {
        flashToast(err.message || "Fehler beim Senden");
    } finally {
        btn.textContent = "E-Mail erneut senden";
        btn.disabled = false;
    }
}

// --- Avatar step ---
function setOnbAvatarEmoji(emoji) {
    onb.draft.emoji = emoji;
    onb.draft.avatarImage = null;
    $("#onbAvatarCircle").textContent = emoji;
    $$("#onbEmojiStrip button").forEach(b => {
        b.classList.toggle("selected", b.dataset.onbEmoji === emoji);
    });
}

function handleOnbAvatarFile(file) {
    if (!file || !file.type.startsWith("image/")) return;
    downscaleImage(file, 400, 0.82, (dataUrl) => {
        onb.draft.avatarImage = dataUrl;
        $("#onbAvatarCircle").innerHTML = `<img src="${dataUrl}" alt="" />`;
    });
}

// --- Size / personality pickers ---
function bindPicker(container, key, draftKey) {
    $$(`${container} button`).forEach(b => {
        b.addEventListener("click", () => {
            $$(`${container} button`).forEach(x => x.classList.remove("selected"));
            b.classList.add("selected");
            onb.draft[draftKey] = b.dataset[key];
        });
    });
}

// --- Location step ---
function onbUseGps() {
    if (!navigator.geolocation) {
        flashToast("Geolocation nicht verfügbar");
        return;
    }
    const btn = $("#useGpsBtn");
    const orig = btn.textContent;
    btn.textContent = "📡 Standort wird ermittelt…";
    btn.disabled = true;
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            onb.draft.location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            onb.draft.city = "Mein Standort";
            $("#onbCity").value = "";
            $$(".city-chips button").forEach(b => b.classList.remove("selected"));
            btn.textContent = "✅ Standort erfasst";
            setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 1500);
            flashToast("📍 Standort übernommen");
        },
        () => {
            btn.textContent = orig;
            btn.disabled = false;
            flashToast("Standort konnte nicht ermittelt werden");
        }
    );
}

function onbChooseCity(city) {
    onb.draft.city = city;
    onb.draft.location = CITY_COORDS[city] || CITY_COORDS.Basel;
    $("#onbCity").value = city;
    $$(".city-chips button").forEach(b => {
        b.classList.toggle("selected", b.dataset.city === city);
    });
}

// --- Done step ---
function renderDoneSummary() {
    const d = onb.draft;
    $("#doneName").textContent = d.name;
    const avEl = $("#doneAvatar");
    if (d.avatarImage) avEl.innerHTML = `<img src="${d.avatarImage}" alt="" />`;
    else avEl.textContent = d.emoji;
    const rows = [
        ["🐕", "Name", d.name],
        ["🦴", "Rasse", d.breed],
        ["🎂", "Alter", d.age + " Jahre"],
        ["📏", "Größe", d.size],
        ["⚡", "Energie", d.energy],
        ["🎾", "Spielstil", d.playStyle],
        ["📍", "Standort", d.city]
    ];
    const box = $("#doneSummary");
    box.innerHTML = rows.map(r =>
        `<div class="line"><span>${r[0]} ${r[1]}</span><strong>${escapeHtml(r[2])}</strong></div>`
    ).join("");
    // Konfetti
    launchConfetti();
}

function launchConfetti() {
    const box = $("#confettiBox");
    if (!box) return;
    box.innerHTML = "";
    const colors = ["#ff6b6b", "#ffd166", "#4ecdc4", "#ff8e8e", "#a8e6cf", "#ffb4a2"];
    for (let i = 0; i < 50; i++) {
        const el = document.createElement("i");
        const angle = Math.random() * Math.PI * 2;
        const dist = 100 + Math.random() * 180;
        el.style.setProperty("--cx", Math.cos(angle) * dist + "px");
        el.style.setProperty("--cy", Math.sin(angle) * dist + "px");
        el.style.setProperty("--cr", (Math.random() * 720 - 360) + "deg");
        el.style.background = colors[Math.floor(Math.random() * colors.length)];
        el.style.animationDelay = (Math.random() * 0.3) + "s";
        box.appendChild(el);
    }
}

function finishOnboarding() {
    const d = onb.draft;
    state.myProfile = {
        ...state.myProfile,
        name: d.name,
        breed: d.breed,
        age: d.age,
        size: d.size,
        neutered: d.neutered,
        energy: d.energy,
        playStyle: d.playStyle,
        bio: d.bio,
        emoji: d.emoji,
        avatarImage: d.avatarImage,
        photos: state.myProfile.photos || []
    };
    state.userLocation = d.location;
    state.onboarded = true;
    try {
        const raw = localStorage.getItem("pfotenMatch");
        const existing = raw ? JSON.parse(raw) : {};
        existing.onboarded = true;
        localStorage.setItem("pfotenMatch", JSON.stringify(existing));
    } catch (e) { /* ignore */ }
    saveState();
    sbUpsertProfile({
        ...state.myProfile,
        city: d.city,
        lat: d.location.lat,
        lng: d.location.lng
    }).then(() => sbGetMyFriendCode().catch(() => {})).catch(() => {});
    hideOnboarding();
    applyFilters();
    renderMatches();
    renderProfile();
    if (leafletMap) {
        leafletMap.setView([d.location.lat, d.location.lng], 14);
        renderMap();
    }
    flashToast(`🐾 Willkommen, ${d.name}!`);
}

function bindOnboarding() {
    // Next / Prev buttons (global)
    $$("[data-next]").forEach(b => b.addEventListener("click", onbNext));
    $$("[data-prev]").forEach(b => b.addEventListener("click", onbPrev));
    // Skip
    $("#skipOnboardBtn").addEventListener("click", () => {
        onb.draft.name = "Bello";
        onb.draft.breed = "Labrador-Mix";
        finishOnboarding();
    });
    // Auth — Register mode
    $("#regGoogleBtn").addEventListener("click", () => handleOAuth("google"));
    $("#regAppleBtn").addEventListener("click", () => handleOAuth("apple"));
    $("#showRegEmailBtn").addEventListener("click", () => {
        $("#regEmailForm").classList.remove("hidden");
        $("#regEmail").focus();
    });
    $("#regPass").addEventListener("input", () => updatePwStrength($("#regPass"), $("#regPwStrength")));
    $("#regSubmitBtn").addEventListener("click", handleEmailRegister);
    // Auth — Login mode
    $("#loginGoogleBtn").addEventListener("click", () => handleOAuth("google"));
    $("#loginAppleBtn").addEventListener("click", () => handleOAuth("apple"));
    $("#showLoginEmailBtn").addEventListener("click", () => {
        $("#loginEmailForm").classList.remove("hidden");
        $("#loginEmail").focus();
    });
    $("#loginSubmitBtn").addEventListener("click", handleEmailLogin);
    // Auth — Switch between register / login
    $("#switchToLogin").addEventListener("click", () => showAuthMode("login"));
    $("#switchToRegister").addEventListener("click", () => showAuthMode("register"));
    // Auth — Verification mode
    $("#verifyLoginBtn").addEventListener("click", handleVerifyLogin);
    $("#verifyResendBtn").addEventListener("click", handleResendVerification);
    // Name preview
    $("#onbName").addEventListener("input", (e) => {
        const v = e.target.value.trim();
        $("#namePreview").textContent = v ? `Hallo, ${v}! 🐾` : "";
        if (v) $("#step3Title").textContent = `Erzähl uns von ${v}`;
    });
    // Emoji strip
    $$("#onbEmojiStrip button").forEach(b => {
        b.addEventListener("click", () => setOnbAvatarEmoji(b.dataset.onbEmoji));
    });
    $("#onbEmojiStrip button[data-onb-emoji='🐕']").classList.add("selected");
    // Avatar upload
    $("#onbCameraBtn").addEventListener("click", () => $("#onbAvatarInput").click());
    $("#onbAvatarInput").addEventListener("change", (e) => {
        const f = e.target.files && e.target.files[0];
        if (f) handleOnbAvatarFile(f);
        e.target.value = "";
    });
    // Age slider
    $("#onbAge").addEventListener("input", (e) => {
        $("#onbAgeLabel").textContent = e.target.value;
        onb.draft.age = parseInt(e.target.value);
    });
    // Pickers
    bindPicker("#sizePicker",   "size",   "size");
    bindPicker("#energyPicker", "energy", "energy");
    bindPicker("#playPicker",   "play",   "playStyle");
    bindPicker("#neutPicker",   "neut",   "neutered");
    // Bio
    $("#onbBio").addEventListener("input", (e) => {
        $("#bioCount").textContent = e.target.value.length;
    });
    $$("#bioSuggestions button").forEach(b => {
        b.addEventListener("click", () => {
            $("#onbBio").value = b.dataset.sugg;
            $("#bioCount").textContent = b.dataset.sugg.length;
        });
    });
    // Location
    $("#useGpsBtn").addEventListener("click", onbUseGps);
    $$(".city-chips button").forEach(b => {
        b.addEventListener("click", () => onbChooseCity(b.dataset.city));
    });
    $("#onbCity").addEventListener("input", (e) => {
        const v = e.target.value.trim();
        onb.draft.city = v || "Basel";
    });
    // Done
    $("#finishOnboardBtn").addEventListener("click", finishOnboarding);
}

// ---------- Friend Code / Share ----------

async function openShareProfileModal() {
    $("#shareProfileModal").classList.remove("hidden");
    const codeEl = $("#myFriendCode");
    if (!_sbReady()) {
        codeEl.textContent = "⚠ Verbindung fehlgeschlagen";
        codeEl.style.fontSize = "1rem";
        return;
    }
    codeEl.style.fontSize = "";
    codeEl.textContent = "⏳ Wird geladen…";
    try {
        const session = await sbGetSession();
        if (!session) {
            codeEl.textContent = "Bitte zuerst einloggen";
            codeEl.style.fontSize = "1rem";
            return;
        }
        const code = await sbGetMyFriendCode();
        codeEl.textContent = code || "Fehler";
    } catch (e) {
        codeEl.textContent = "Fehler: " + (e.message || "Unbekannt");
        codeEl.style.fontSize = "1rem";
    }
}

let _pendingFriendProfile = null;

async function connectFriendByCode() {
    const code = $("#friendCodeInput").value.trim().toUpperCase();
    if (code.length < 8) { flashToast("Bitte vollständigen Code eingeben"); return; }
    const btn = $("#confirmConnectBtn");
    const resultEl = $("#friendLookupResult");
    btn.disabled = true;
    btn.textContent = "⏳ Suche…";
    resultEl.classList.add("hidden");
    try {
        const profile = await sbFindByFriendCode(code);
        if (!profile) {
            resultEl.textContent = "❌ Kein Hund mit diesem Code gefunden.";
            resultEl.classList.remove("hidden");
            btn.disabled = false;
            btn.textContent = "Verbinden";
            return;
        }
        // Check not own code
        const me = await sbGetUser();
        if (me && profile.user_id === me.id) {
            resultEl.textContent = "😄 Das ist dein eigener Code!";
            resultEl.classList.remove("hidden");
            btn.disabled = false;
            btn.textContent = "Verbinden";
            return;
        }
        // Build a local dog profile from Supabase data
        _pendingFriendProfile = {
            id: 9000 + Math.abs(profile.friend_code.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % 1000,
            name: profile.name,
            emoji: profile.emoji || "🐕",
            breed: profile.breed || "Mischling",
            age: profile.age || 3,
            size: profile.size || "Mittel",
            neutered: profile.neutered || "Nein",
            energy: profile.energy || "Ausgeglichen",
            playStyle: profile.play_style || "Rennend",
            tags: [],
            warns: [],
            bio: profile.bio || "",
            distance: 0.5,
            owner: "Freund",
            lat: profile.lat || 47.5585,
            lng: profile.lng || 7.5880,
            isFriend: true,
            friendUserId: profile.user_id,
            friendCode: profile.friend_code
        };
        resultEl.innerHTML = `✅ <strong>${profile.name}</strong> gefunden! (${profile.breed || "Mischling"}, ${profile.age || "?"} J.) – Verbinden?`;
        resultEl.classList.remove("hidden");
        btn.textContent = "✓ Ja, verbinden!";
        btn.disabled = false;
        btn.onclick = () => finalizeFriendConnect();
    } catch (e) {
        resultEl.textContent = "Fehler beim Suchen. Bitte nochmal versuchen.";
        resultEl.classList.remove("hidden");
        btn.disabled = false;
        btn.textContent = "Verbinden";
    }
}

async function finalizeFriendConnect() {
    if (!_pendingFriendProfile) return;
    const dog = _pendingFriendProfile;
    _pendingFriendProfile = null;
    if (state.matches.some(m => m.profile.friendCode === dog.friendCode)) {
        flashToast("Ihr seid bereits verbunden! 🐾");
        $("#connectFriendModal").classList.add("hidden");
        return;
    }
    let conversationId = null;
    try {
        conversationId = await sbFindOrCreateConversation(dog.friendUserId);
    } catch (e) { /* offline */ }
    state.matches.push({
        profile: dog,
        messages: [],
        conversationId: conversationId
    });
    saveState();
    $("#connectFriendModal").classList.add("hidden");
    switchView("matches");
    flashToast(`🎉 Mit ${dog.name} verbunden! Starte jetzt den Chat.`);
    const btn = $("#confirmConnectBtn");
    btn.textContent = "Verbinden";
    btn.onclick = connectFriendByCode;
    renderMatches();
}

// ---------- Supabase Sync ----------
async function syncFromSupabase() {
    try {
        const user = await sbGetUser();
        if (!user) return;
        const profile = await sbLoadProfile();
        if (profile) Object.assign(state.myProfile, profile);
        const dbMatches = await sbLoadMatches();
        for (const dbm of dbMatches) {
            const dog = DOG_PROFILES.find(d => d.id === dbm.dog_id);
            if (!dog) continue;
            _matchDbIds[dbm.dog_id] = dbm.id;
            if (state.matches.some(m => m.profile.id === dbm.dog_id)) continue;
            const msgs = await sbLoadMessages(dbm.id);
            state.matches.push({ profile: dog, messages: msgs.length ? msgs : [{ id: genMsgId(), from: "them", type: "text", text: `Woof! Ich bin ${dog.name} 🐾`, ts: new Date(dbm.created_at).getTime(), status: "delivered", reactions: [] }] });
        }
    } catch (e) { /* offline or tables not created yet */ }
}

// ---------- Init ----------
function bindDailyPickEvents() {
    const btn = $("#dailyPickGoBtn");
    if (btn) btn.addEventListener("click", jumpToDailyPick);
}

async function init() {
    loadState();
    if (state.dangers.length === 0 && typeof DEMO_DANGERS !== "undefined") {
        state.dangers = DEMO_DANGERS.map(d => ({ ...d }));
    }
    if (state.checkIns.length === 0 && typeof DEMO_CHECKINS !== "undefined") {
        state.checkIns = DEMO_CHECKINS.map(c => ({ ...c }));
    }
    seedDemoStoriesIfEmpty();
    bindEvents();
    bindProfileForm();
    bindOnboarding();
    bindDailyPickEvents();
    bindMapControls();
    bindSitterRegistration();
    renderMapCategoryChips();
    updateSitterRequestsBadge();
    if (state.premium) $("#premiumBadge").classList.add("active");
    document.documentElement.classList.toggle("dark", state.settings.dark);
    applyFilters();
    renderMatches();
    renderProfile();
    updateBookingsBadge();
    updateMatchesNavBadge();
    try {
        const session = await sbGetSession();
        if (session) {
            const profile = await sbLoadProfile();
            if (profile) {
                Object.assign(state.myProfile, profile);
                state.onboarded = true;
                await syncFromSupabase();
                saveState();
                applyFilters();
                renderMatches();
                renderProfile();
            } else {
                showOnboarding();
                onbGoto(2);
                return;
            }
        }
    } catch (e) { /* Supabase unavailable – continue with localStorage */ }
    if (!state.onboarded) {
        showOnboarding();
    }
}

document.addEventListener("DOMContentLoaded", init);
