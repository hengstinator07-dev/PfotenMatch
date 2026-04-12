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
    filters: { size: "", play: "", energy: "", breed: "" },
    myProfile: {
        name: "Bello", breed: "Labrador-Mix", age: 3,
        size: "Mittel", neutered: "Nein",
        energy: "Ausgeglichen", playStyle: "Rennend",
        tags: "", bio: "Liebt Stöckchen und Matschpfützen!",
        emoji: "🐕"
    },
    activeChatId: null
};

// ---------- Utility ----------
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function saveState() {
    try {
        localStorage.setItem("pfotenMatch", JSON.stringify({
            matches: state.matches.map(m => ({ id: m.profile.id, messages: m.messages })),
            premium: state.premium,
            myProfile: state.myProfile
        }));
    } catch (e) { /* ignore */ }
}

function loadState() {
    try {
        const raw = localStorage.getItem("pfotenMatch");
        if (!raw) return;
        const data = JSON.parse(raw);
        if (data.premium) state.premium = true;
        if (data.myProfile) Object.assign(state.myProfile, data.myProfile);
        if (Array.isArray(data.matches)) {
            state.matches = data.matches
                .map(m => {
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
}

// ---------- Profile filtering ----------
function applyFilters() {
    const { size, play, energy, breed } = state.filters;
    state.profiles = DOG_PROFILES.filter(p => {
        if (p.distance > state.radius) return false;
        if (size && !p.size.startsWith(size)) return false;
        if (play && !p.playStyle.includes(play)) return false;
        if (energy && !p.energy.includes(energy)) return false;
        if (state.premium && breed && !p.breed.toLowerCase().includes(breed.toLowerCase())) return false;
        // schon in Matches? weglassen
        if (state.matches.some(m => m.profile.id === p.id)) return false;
        return true;
    });
    state.currentIdx = 0;
    renderCardStack();
}

// ---------- Card stack rendering ----------
function renderCardStack() {
    const stack = $("#cardStack");
    stack.innerHTML = "";
    const remaining = state.profiles.slice(state.currentIdx, state.currentIdx + 3).reverse();

    if (remaining.length === 0) {
        stack.innerHTML = `
            <div class="empty-cards">
                <div class="big">🐾</div>
                <h3>Keine Hunde mehr in der Nähe</h3>
                <p>Versuche den Umkreis zu erweitern oder schau später wieder rein!</p>
            </div>`;
        return;
    }

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

        card.innerHTML = `
            <div class="photo" style="background: linear-gradient(135deg, #ffd5cd, #ffebe0);">
                <div>${dog.emoji}</div>
            </div>
            <div class="stamp like">LIKE</div>
            <div class="stamp nope">NOPE</div>
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
        const rot = currX * 0.08;
        card.style.transform = `translate(${currX}px, ${currY}px) rotate(${rot}deg)`;
        const likeStamp = card.querySelector(".stamp.like");
        const nopeStamp = card.querySelector(".stamp.nope");
        if (likeStamp && nopeStamp) {
            likeStamp.style.opacity = Math.max(0, currX / 100);
            nopeStamp.style.opacity = Math.max(0, -currX / 100);
        }
    };
    const onUp = () => {
        if (!dragging) return;
        dragging = false;
        card.classList.remove("dragging");
        if (currX > 120) return flyAway(card, dog, "like");
        if (currX < -120) return flyAway(card, dog, "pass");
        card.style.transform = "";
        card.querySelector(".stamp.like").style.opacity = 0;
        card.querySelector(".stamp.nope").style.opacity = 0;
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
    const x = direction === "like" ? window.innerWidth : -window.innerWidth;
    card.style.transform = `translate(${x}px, 0) rotate(${direction === "like" ? 30 : -30}deg)`;
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
    state.matches.push({
        profile: dog,
        messages: [{ from: "them", text: `Woof! Ich bin ${dog.name} 🐾`, ts: Date.now() }]
    });
    saveState();
}

// ---------- Match modal ----------
function showMatchModal(dog) {
    $("#matchText").textContent = `${state.myProfile.name} und ${dog.name} wollen sich treffen!`;
    $("#matchAvatarMine").textContent = state.myProfile.emoji;
    $("#matchAvatarOther").textContent = dog.emoji;
    $("#matchModal").classList.remove("hidden");
    $("#sendMessageBtn").onclick = () => {
        $("#matchModal").classList.add("hidden");
        openChat(dog.id);
    };
}

// ---------- Matches list ----------
function renderMatches() {
    const list = $("#matchesList");
    if (state.matches.length === 0) {
        list.innerHTML = `<p class="empty-state">Noch keine Matches – swipe los! 🐾</p>`;
        return;
    }
    list.innerHTML = "";
    state.matches.forEach(m => {
        const lastMsg = m.messages[m.messages.length - 1];
        const item = document.createElement("div");
        item.className = "match-item";
        item.innerHTML = `
            <div class="av">${m.profile.emoji}</div>
            <div class="meta">
                <h4>${m.profile.name} · ${m.profile.breed}</h4>
                <p>${lastMsg ? lastMsg.text : "Noch keine Nachricht"}</p>
            </div>
            <button class="meet-btn" data-meet="${m.profile.id}">📍 Treffen</button>
        `;
        item.addEventListener("click", (e) => {
            if (e.target.dataset.meet) {
                e.stopPropagation();
                openMeetPlanner(m.profile);
            } else {
                openChat(m.profile.id);
            }
        });
        list.appendChild(item);
    });
}

// ---------- Chat ----------
function openChat(dogId) {
    const match = state.matches.find(m => m.profile.id === dogId);
    if (!match) return;
    state.activeChatId = dogId;
    $("#chatAvatar").textContent = match.profile.emoji;
    $("#chatName").textContent = `${match.profile.name} (von ${match.profile.owner})`;
    renderChatMessages();
    $("#chatModal").classList.remove("hidden");
    setTimeout(() => $("#chatInput").focus(), 100);
}

function renderChatMessages() {
    const match = state.matches.find(m => m.profile.id === state.activeChatId);
    if (!match) return;
    const box = $("#chatMessages");
    box.innerHTML = "";
    match.messages.forEach(msg => {
        const bubble = document.createElement("div");
        bubble.className = "chat-bubble " + msg.from;
        bubble.textContent = msg.text;
        box.appendChild(bubble);
    });
    box.scrollTop = box.scrollHeight;
}

function sendMessage(text) {
    const match = state.matches.find(m => m.profile.id === state.activeChatId);
    if (!match || !text.trim()) return;
    match.messages.push({ from: "me", text: text.trim(), ts: Date.now() });
    renderChatMessages();
    saveState();
    // Auto-Antwort
    setTimeout(() => {
        const reply = AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)];
        match.messages.push({ from: "them", text: reply, ts: Date.now() });
        renderChatMessages();
        saveState();
    }, 900 + Math.random() * 800);
}

// ---------- Map ----------
function renderMap() {
    const canvas = $("#mapCanvas");
    canvas.innerHTML = "";
    // Me
    const me = document.createElement("div");
    me.className = "map-pin me";
    me.textContent = "📍";
    me.style.left = "50%";
    me.style.top = "50%";
    me.title = "Dein Standort";
    canvas.appendChild(me);
    // Treffpunkte
    MEETING_SPOTS.forEach(s => {
        const pin = document.createElement("div");
        pin.className = "map-pin";
        pin.textContent = s.icon;
        pin.style.left = s.x + "%";
        pin.style.top = s.y + "%";
        pin.title = s.name;
        pin.addEventListener("click", () => alert(`${s.icon} ${s.name}\n\n${s.desc}`));
        canvas.appendChild(pin);
    });
    // Hunde in Umkreis als kleine Pfoten
    state.profiles.slice(0, 6).forEach(d => {
        const pin = document.createElement("div");
        pin.className = "map-pin";
        pin.textContent = "🐾";
        pin.style.left = d.x + "%";
        pin.style.top = d.y + "%";
        pin.style.fontSize = "18px";
        pin.title = d.name;
        canvas.appendChild(pin);
    });
    // Spot-Liste
    const list = $("#spotList");
    list.innerHTML = "";
    MEETING_SPOTS.forEach(s => {
        const el = document.createElement("div");
        el.className = "spot-item";
        el.innerHTML = `
            <div class="icon">${s.icon}</div>
            <div class="info">
                <h4>${s.name}</h4>
                <p>${s.desc}</p>
            </div>
        `;
        list.appendChild(el);
    });
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

// ---------- Profile form ----------
function bindProfileForm() {
    const f = $("#myProfileForm");
    // Avatar-Picker
    $$(".avatar-options button").forEach(b => {
        b.addEventListener("click", () => {
            $$(".avatar-options button").forEach(x => x.classList.remove("selected"));
            b.classList.add("selected");
            state.myProfile.emoji = b.dataset.emoji;
            $("#avatarPreview").textContent = b.dataset.emoji;
        });
    });
    f.addEventListener("submit", (e) => {
        e.preventDefault();
        state.myProfile = {
            ...state.myProfile,
            name: $("#pfName").value,
            breed: $("#pfBreed").value,
            age: parseInt($("#pfAge").value),
            size: $("#pfSize").value,
            neutered: $("#pfNeutered").value,
            energy: $("#pfEnergy").value,
            playStyle: $("#pfPlay").value,
            tags: $("#pfTags").value,
            bio: $("#pfBio").value
        };
        saveState();
        flashToast("Profil gespeichert! 🐾");
    });
    // Initial aus State befüllen
    $("#pfName").value = state.myProfile.name;
    $("#pfBreed").value = state.myProfile.breed;
    $("#pfAge").value = state.myProfile.age;
    $("#pfBio").value = state.myProfile.bio;
    $("#avatarPreview").textContent = state.myProfile.emoji;
}

function flashToast(text) {
    $("#adText").textContent = text;
    $("#adBanner").classList.remove("hidden");
    setTimeout(() => $("#adBanner").classList.add("hidden"), 2500);
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
    // Radius
    $("#radiusSlider").addEventListener("input", (e) => {
        state.radius = parseInt(e.target.value);
        $("#radiusLabel").textContent = state.radius;
        applyFilters();
    });
    // Filter modal
    $("#openFiltersBtn").addEventListener("click", () => $("#filterModal").classList.remove("hidden"));
    $("#applyFilterBtn").addEventListener("click", () => {
        state.filters.size = $("#fSize").value;
        state.filters.play = $("#fPlay").value;
        state.filters.energy = $("#fEnergy").value;
        const breedVal = $("#fBreed").value;
        if (breedVal && !state.premium) {
            $("#filterModal").classList.add("hidden");
            openPremium();
            return;
        }
        state.filters.breed = breedVal;
        $("#filterModal").classList.add("hidden");
        applyFilters();
    });
    $("#resetFilterBtn").addEventListener("click", () => {
        state.filters = { size: "", play: "", energy: "", breed: "" };
        $("#fSize").value = ""; $("#fPlay").value = "";
        $("#fEnergy").value = ""; $("#fBreed").value = "";
        applyFilters();
    });
    // Match modal
    $("#keepSwipingBtn").addEventListener("click", () => $("#matchModal").classList.add("hidden"));
    // Chat modal
    $("#chatBack").addEventListener("click", () => $("#chatModal").classList.add("hidden"));
    $("#chatForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const inp = $("#chatInput");
        sendMessage(inp.value);
        inp.value = "";
    });
    // Premium
    $("#premiumBadge").addEventListener("click", openPremium);
    $("#buyPremiumBtn").addEventListener("click", activatePremium);
    $("#closePremiumBtn").addEventListener("click", () => $("#premiumModal").classList.add("hidden"));
    // Meet
    $("#cancelMeetBtn").addEventListener("click", () => $("#meetModal").classList.add("hidden"));
    // Ad close
    $("#adClose").addEventListener("click", () => $("#adBanner").classList.add("hidden"));
    // Close modals on backdrop click
    $$(".modal").forEach(m => {
        m.addEventListener("click", (e) => {
            if (e.target === m) m.classList.add("hidden");
        });
    });
}

// ---------- Init ----------
function init() {
    loadState();
    bindEvents();
    bindProfileForm();
    if (state.premium) $("#premiumBadge").classList.add("active");
    applyFilters();
    renderMatches();
}

document.addEventListener("DOMContentLoaded", init);
