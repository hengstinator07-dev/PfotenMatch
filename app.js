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
    filters: { size: "", play: "", energy: "", breed: "" },
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
        dark: false, lang: "de", unit: "km"
    },
    activeChatId: null,
    // Live-Check-Ins: [{spotId, dogName, until (ts)}]  (eigener Check-in hat dogName === myProfile.name)
    checkIns: [],
    // Gefahren-Radar: [{id, type, lat, lng, desc, ts, reporter}]
    dangers: []
};

// ---------- Utility ----------
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function saveState() {
    try {
        localStorage.setItem("pfotenMatch", JSON.stringify({
            matches: state.matches.map(m => ({ id: m.profile.id, messages: m.messages })),
            premium: state.premium,
            myProfile: state.myProfile,
            userLocation: state.userLocation,
            checkIns: state.checkIns,
            dangers: state.dangers,
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
        if (data.myProfile) Object.assign(state.myProfile, data.myProfile);
        if (!Array.isArray(state.myProfile.photos)) state.myProfile.photos = [];
        if (data.settings) Object.assign(state.settings, data.settings);
        if (data.userLocation) state.userLocation = data.userLocation;
        if (Array.isArray(data.checkIns)) state.checkIns = data.checkIns;
        if (Array.isArray(data.dangers)) state.dangers = data.dangers;
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
    if (name === "profile") renderProfile();
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
        item.innerHTML = `
            <div class="av">${m.profile.emoji}</div>
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
            } else {
                openChat(m.profile.id);
            }
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
    // Migration älterer Nachrichten
    match.messages = match.messages.map(migrateMessage);
    // Reply/Attach/Picker zurücksetzen
    resetChatUi();
    // Header setzen
    $("#chatAvatar").textContent = match.profile.emoji;
    $("#chatName").textContent = `${match.profile.name} · ${match.profile.owner}`;
    const status = dogOnlineStatus(match.profile.id);
    const statusEl = $("#chatStatus");
    statusEl.textContent = status;
    statusEl.classList.toggle("online", status === "online");
    // Unread zurücksetzen
    chatUi.unread[dogId] = 0;
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
    pushMessage(match, {
        id: genMsgId(),
        from: "me",
        type: "text",
        text: text.trim(),
        ts: Date.now(),
        status: "sent",
        reactions: [],
        replyTo: chatUi.replyTo
    });
    cancelReply();
    // Status-Progression + Auto-Reply
    scheduleStatusProgression(match);
    scheduleAutoReply(match);
}

function pushMessage(match, msg) {
    match.messages.push(msg);
    renderChatMessages();
    saveState();
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
    // Typing indicator
    $("#typingName").textContent = match.profile.name + " schreibt…";
    $("#typingIndicator").classList.remove("hidden");
    const delay = 1100 + Math.random() * 1200;
    if (chatUi.typingTimer) clearTimeout(chatUi.typingTimer);
    chatUi.typingTimer = setTimeout(() => {
        $("#typingIndicator").classList.add("hidden");
        const reply = AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)];
        const active = state.activeChatId === match.profile.id;
        match.messages.push({
            id: genMsgId(),
            from: "them",
            type: "text",
            text: reply,
            ts: Date.now(),
            status: active ? "read" : "delivered",
            reactions: []
        });
        if (!active) {
            chatUi.unread[match.profile.id] = (chatUi.unread[match.profile.id] || 0) + 1;
        }
        if (active) renderChatMessages();
        saveState();
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
let mapLayers = { spots: [], dogs: [], me: null, dangers: [] };

function buildEmojiIcon(emoji, size = 32, extraClass = "") {
    return L.divIcon({
        className: "emoji-marker " + extraClass,
        html: `<div class="emoji-pin" style="font-size:${size}px">${emoji}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size]
    });
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
        // CartoDB Voyager – CC BY 3.0, kommerziell frei mit Attribution.
        // Sauberer, moderner Look wie bei Apple/Tinder-artigen Apps.
        L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
            maxZoom: 20,
            subdomains: "abcd",
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a>'
        }).addTo(leafletMap);
    }

    // Abgelaufene Einträge bereinigen
    pruneCheckIns();
    pruneDangers();

    // Alte Marker entfernen
    mapLayers.spots.forEach(m => leafletMap.removeLayer(m));
    mapLayers.dogs.forEach(m => leafletMap.removeLayer(m));
    mapLayers.dangers.forEach(m => leafletMap.removeLayer(m));
    if (mapLayers.me) leafletMap.removeLayer(mapLayers.me);
    mapLayers.spots = [];
    mapLayers.dogs = [];
    mapLayers.dangers = [];

    // Eigener Standort (pulsierend)
    mapLayers.me = L.marker([state.userLocation.lat, state.userLocation.lng], {
        icon: buildEmojiIcon("📍", 38, "me-marker"),
        title: "Dein Standort"
    }).addTo(leafletMap).bindPopup("<strong>Du bist hier</strong>");

    // Umkreis-Kreis
    if (mapLayers.radius) leafletMap.removeLayer(mapLayers.radius);
    mapLayers.radius = L.circle([state.userLocation.lat, state.userLocation.lng], {
        radius: state.radius * 1000,
        color: "#ff6b6b",
        weight: 2,
        fillColor: "#ff6b6b",
        fillOpacity: 0.08
    }).addTo(leafletMap);

    // Treffpunkte
    MEETING_SPOTS.forEach(s => {
        const count = countCheckIns(s.id);
        const marker = L.marker([s.lat, s.lng], {
            icon: buildEmojiIcon(s.icon, 32),
            title: s.name
        }).addTo(leafletMap);
        const checkInLine = count > 0
            ? `<br><span style="color:#4ecdc4;font-weight:700">🐾 ${count} Hund${count > 1 ? "e" : ""} gerade hier</span>`
            : "";
        marker.bindPopup(`<strong>${s.icon} ${s.name}</strong><br>${s.desc}${checkInLine}`);
        mapLayers.spots.push(marker);
    });

    // Gefahren-Marker
    state.dangers.forEach(d => {
        const type = DANGER_TYPES.find(t => t.id === d.type) || DANGER_TYPES[DANGER_TYPES.length - 1];
        const marker = L.marker([d.lat, d.lng], {
            icon: buildEmojiIcon(type.icon, 30),
            title: type.label
        }).addTo(leafletMap);
        marker.bindPopup(
            `<strong>⚠ ${type.label}</strong><br>` +
            (d.desc ? d.desc + "<br>" : "") +
            `<small>Gemeldet ${formatAgo(d.ts)} von ${d.reporter}</small>`
        );
        mapLayers.dangers.push(marker);
    });

    // Hunde im Umkreis
    state.profiles.forEach(d => {
        if (!d.lat || !d.lng) return;
        const marker = L.marker([d.lat, d.lng], {
            icon: buildEmojiIcon(d.emoji, 28),
            title: d.name
        }).addTo(leafletMap);
        marker.bindPopup(`<strong>${d.name}</strong><br>${d.breed} · ${d.distance} km`);
        mapLayers.dogs.push(marker);
    });

    // Map muss nach Sichtbarkeitswechsel neu berechnet werden
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
            leafletMap.setView([s.lat, s.lng], 15);
            mapLayers.spots.find(m => m.getLatLng().lat === s.lat)?.openPopup();
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
        push:          $("#setPush").checked,
        chatNotif:     $("#setChatNotif").checked,
        matchNotif:    $("#setMatchNotif").checked,
        dangerNotif:   $("#setDangerNotif").checked,
        invisible:     $("#setInvisible").checked && state.premium,
        locShare:      $("#setLocShare").checked,
        readReceipts:  $("#setReadReceipts").checked,
        dark:          $("#setDark").checked,
        lang:          $("#setLang").value,
        unit:          $("#setUnit").value
    };
    document.documentElement.classList.toggle("dark", state.settings.dark);
    saveState();
    $("#settingsModal").classList.add("hidden");
    flashToast("⚙ Einstellungen gespeichert");
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
        if (leafletMap) renderMap();
    });
    // Locate button
    $("#locateBtn")?.addEventListener("click", locateUser);
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
    $("#chatBack").addEventListener("click", () => {
        resetChatUi();
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
            if (kind === "addPhoto")  $("#galleryInput").click();
            if (kind === "settings")  openSettings();
            if (kind === "premium")   openPremium();
            if (kind === "help")      flashToast("💌 Feedback an hallo@pfotenmatch.app");
            if (kind === "logout") {
                if (confirm("Wirklich abmelden? Deine lokalen Daten bleiben erhalten.")) {
                    flashToast("👋 Abgemeldet (Demo)");
                }
            }
        });
    });
    $("#editProfileBtn").addEventListener("click", openEditProfile);
    $("#shareProfileBtn").addEventListener("click", () => {
        const p = state.myProfile;
        const txt = `Schau dir ${p.name} auf PfotenMatch an! 🐾`;
        if (navigator.share) {
            navigator.share({ title: "PfotenMatch", text: txt }).catch(() => {});
        } else {
            if (navigator.clipboard) navigator.clipboard.writeText(txt).catch(() => {});
            flashToast("🔗 In Zwischenablage kopiert");
        }
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
    // Demo-Daten befüllen, wenn Gefahren/Check-Ins leer sind
    if (state.dangers.length === 0 && typeof DEMO_DANGERS !== "undefined") {
        state.dangers = DEMO_DANGERS.map(d => ({ ...d }));
    }
    if (state.checkIns.length === 0 && typeof DEMO_CHECKINS !== "undefined") {
        state.checkIns = DEMO_CHECKINS.map(c => ({ ...c }));
    }
    bindEvents();
    bindProfileForm();
    if (state.premium) $("#premiumBadge").classList.add("active");
    document.documentElement.classList.toggle("dark", state.settings.dark);
    applyFilters();
    renderMatches();
    renderProfile();
}

document.addEventListener("DOMContentLoaded", init);
