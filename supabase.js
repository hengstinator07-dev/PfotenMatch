/* ============================================================
   PfotenMatch – Supabase Integration (crash-safe)
   ============================================================ */

const SUPABASE_URL = "https://qgmccuouetouzhpfynwq.supabase.co";
const SUPABASE_KEY = "sb_publishable_M6FwQhVrmkVBx9GUbmURYg_m2YBidkN";

let sb = null;
try {
    if (typeof supabase !== "undefined" && supabase.createClient) {
        sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
} catch (e) {
    console.warn("Supabase init failed:", e);
}

function _sbReady() { return sb !== null; }

// ---------- Auth Helpers ----------

async function sbSignUp(email, password) {
    if (!_sbReady()) throw new Error("Supabase nicht verfügbar");
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) throw error;
    return data;
}

async function sbSignIn(email, password) {
    if (!_sbReady()) throw new Error("Supabase nicht verfügbar");
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
}

async function sbSignOut() {
    if (!_sbReady()) return;
    const { error } = await sb.auth.signOut();
    if (error) throw error;
}

async function sbGetUser() {
    if (!_sbReady()) return null;
    const { data: { user } } = await sb.auth.getUser();
    return user;
}

async function sbGetSession() {
    if (!_sbReady()) return null;
    const { data: { session } } = await sb.auth.getSession();
    return session;
}

// ---------- OAuth ----------

async function sbSignInWithOAuth(provider) {
    if (!_sbReady()) throw new Error("Supabase nicht verfügbar");
    const { data, error } = await sb.auth.signInWithOAuth({
        provider: provider,
        options: { redirectTo: window.location.origin }
    });
    if (error) throw error;
    return data;
}

async function sbResendConfirmation(email) {
    if (!_sbReady()) throw new Error("Supabase nicht verfügbar");
    const { error } = await sb.auth.resend({
        type: "signup",
        email: email
    });
    if (error) throw error;
}

// ---------- Dog Profile ----------

async function sbUpsertProfile(profile) {
    if (!_sbReady()) return null;
    const user = await sbGetUser();
    if (!user) return null;
    const row = {
        user_id: user.id,
        name: profile.name,
        breed: profile.breed,
        age: profile.age,
        size: profile.size,
        neutered: profile.neutered,
        energy: profile.energy,
        play_style: profile.playStyle,
        tags: profile.tags || "",
        bio: profile.bio || "",
        emoji: profile.emoji || "",
        avatar_image: profile.avatarImage || null,
        photos: profile.photos || [],
        city: profile.city || "Basel",
        lat: profile.lat || 47.5585,
        lng: profile.lng || 7.5880,
        updated_at: new Date().toISOString()
    };
    const { data, error } = await sb
        .from("dog_profiles")
        .upsert(row, { onConflict: "user_id" })
        .select()
        .single();
    if (error) throw error;
    return data;
}

async function sbLoadProfile() {
    if (!_sbReady()) return null;
    const user = await sbGetUser();
    if (!user) return null;
    const { data, error } = await sb
        .from("dog_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
        name: data.name,
        breed: data.breed,
        age: data.age,
        size: data.size,
        neutered: data.neutered,
        energy: data.energy,
        playStyle: data.play_style,
        tags: data.tags,
        bio: data.bio,
        emoji: data.emoji,
        avatarImage: data.avatar_image,
        photos: data.photos || [],
        city: data.city,
        lat: data.lat,
        lng: data.lng
    };
}

async function sbLoadAllProfiles() {
    if (!_sbReady()) return [];
    const user = await sbGetUser();
    const myId = user ? user.id : null;
    const { data, error } = await sb
        .from("dog_profiles")
        .select("*");
    if (error) throw error;
    return (data || [])
        .filter(row => row.user_id !== myId)
        .map(row => ({
            id: "sb_" + row.user_id,
            name: row.name,
            breed: row.breed || "Mischling",
            age: row.age || 0,
            size: row.size || "Mittel",
            neutered: row.neutered === true || row.neutered === "Ja",
            energy: row.energy || "Ausgeglichen",
            playStyle: row.play_style || "Rennend",
            tags: row.tags ? (Array.isArray(row.tags) ? row.tags : []) : [],
            warns: [],
            bio: row.bio || "",
            emoji: row.emoji || "🐕",
            avatarImage: row.avatar_image || null,
            photos: row.photos || [],
            owner: row.name,
            lat: row.lat || 47.5585,
            lng: row.lng || 7.5880,
            distance: 0,
            isReal: true,
            userId: row.user_id,
            friendCode: row.friend_code
        }));
}

// ---------- Matches ----------

async function sbSaveMatch(dogId) {
    if (!_sbReady()) return null;
    const user = await sbGetUser();
    if (!user) return null;
    const { data, error } = await sb
        .from("matches")
        .upsert(
            { user_id: user.id, dog_id: dogId },
            { onConflict: "user_id,dog_id" }
        )
        .select()
        .single();
    if (error) throw error;
    return data;
}

async function sbLoadMatches() {
    if (!_sbReady()) return [];
    const user = await sbGetUser();
    if (!user) return [];
    const { data, error } = await sb
        .from("matches")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
    if (error) throw error;
    return data || [];
}

async function sbDeleteMatch(dogId) {
    if (!_sbReady()) return;
    const user = await sbGetUser();
    if (!user) return;
    await sb.from("matches").delete().eq("user_id", user.id).eq("dog_id", dogId);
}

// ---------- Messages ----------

async function sbSaveMessage(matchDbId, msg) {
    if (!_sbReady()) return null;
    const { data, error } = await sb
        .from("messages")
        .insert({
            match_id: matchDbId,
            sender: msg.from,
            type: msg.type || "text",
            text: msg.text || null,
            image: msg.image || null,
            location: msg.location || null,
            duration: msg.duration || null,
            reply_to: msg.replyTo || null,
            reactions: msg.reactions || [],
            deleted: msg.deleted || false,
            status: msg.status || "sent",
            created_at: new Date(msg.ts || Date.now()).toISOString()
        })
        .select()
        .single();
    if (error) throw error;
    return data;
}

async function sbLoadMessages(matchDbId) {
    if (!_sbReady()) return [];
    const { data, error } = await sb
        .from("messages")
        .select("*")
        .eq("match_id", matchDbId)
        .order("created_at", { ascending: true });
    if (error) throw error;
    return (data || []).map(row => ({
        id: row.id,
        from: row.sender,
        type: row.type || "text",
        text: row.text || "",
        image: row.image || null,
        location: row.location || null,
        duration: row.duration || null,
        replyTo: row.reply_to || null,
        reactions: row.reactions || [],
        deleted: row.deleted || false,
        status: row.status || "sent",
        ts: new Date(row.created_at).getTime()
    }));
}

// ---------- Realtime ----------

let _messageSubscription = null;

function sbSubscribeMessages(matchDbId, onNewMessage) {
    if (!_sbReady()) return;
    if (_messageSubscription) {
        sb.removeChannel(_messageSubscription);
    }
    _messageSubscription = sb
        .channel("messages:" + matchDbId)
        .on(
            "postgres_changes",
            {
                event: "INSERT",
                schema: "public",
                table: "messages",
                filter: "match_id=eq." + matchDbId
            },
            (payload) => {
                const row = payload.new;
                onNewMessage({
                    id: row.id,
                    from: row.sender,
                    type: row.type || "text",
                    text: row.text || "",
                    image: row.image || null,
                    location: row.location || null,
                    duration: row.duration || null,
                    replyTo: row.reply_to || null,
                    reactions: row.reactions || [],
                    deleted: row.deleted || false,
                    status: row.status || "sent",
                    ts: new Date(row.created_at).getTime()
                });
            }
        )
        .subscribe();
}

function sbUnsubscribeMessages() {
    if (_messageSubscription && _sbReady()) {
        sb.removeChannel(_messageSubscription);
        _messageSubscription = null;
    }
}

// ---------- Match DB ID Cache ----------
const _matchDbIds = {};

async function sbGetMatchDbId(dogId) {
    if (!_sbReady()) return null;
    if (_matchDbIds[dogId]) return _matchDbIds[dogId];
    const user = await sbGetUser();
    if (!user) return null;
    const { data } = await sb
        .from("matches")
        .select("id")
        .eq("user_id", user.id)
        .eq("dog_id", dogId)
        .maybeSingle();
    if (data) _matchDbIds[dogId] = data.id;
    return data ? data.id : null;
}

// ---------- Friend Code ----------

function generateFriendCode(userId) {
    const clean = userId.replace(/-/g, "").toUpperCase();
    return clean.slice(0, 4) + "-" + clean.slice(4, 8);
}

async function sbSaveFriendCode(userId) {
    if (!_sbReady()) return null;
    const code = generateFriendCode(userId);
    await sb.from("dog_profiles")
        .update({ friend_code: code })
        .eq("user_id", userId);
    return code;
}

async function sbFindByFriendCode(code) {
    if (!_sbReady()) return null;
    const normalized = code.toUpperCase().replace(/\s/g, "");
    const { data, error } = await sb
        .from("dog_profiles")
        .select("*")
        .eq("friend_code", normalized)
        .maybeSingle();
    if (error) throw error;
    return data;
}

async function sbGetMyFriendCode() {
    if (!_sbReady()) return null;
    const user = await sbGetUser();
    if (!user) return null;
    const { data } = await sb
        .from("dog_profiles")
        .select("friend_code")
        .eq("user_id", user.id)
        .maybeSingle();
    if (data && data.friend_code) return data.friend_code;
    return sbSaveFriendCode(user.id);
}

// ---------- Conversations (Real Chat) ----------

async function sbFindOrCreateConversation(otherUserId) {
    if (!_sbReady()) return null;
    const user = await sbGetUser();
    if (!user) return null;
    const { data: existing } = await sb
        .from("conversations")
        .select("id")
        .or(`and(user_a_id.eq.${user.id},user_b_id.eq.${otherUserId}),and(user_a_id.eq.${otherUserId},user_b_id.eq.${user.id})`)
        .maybeSingle();
    if (existing) return existing.id;
    const { data, error } = await sb
        .from("conversations")
        .insert({ user_a_id: user.id, user_b_id: otherUserId })
        .select()
        .single();
    if (error) throw error;
    return data.id;
}

async function sbSendChatMessage(conversationId, msg) {
    if (!_sbReady()) return null;
    const user = await sbGetUser();
    if (!user) return null;
    const { data, error } = await sb
        .from("chat_messages")
        .insert({
            conversation_id: conversationId,
            sender_id: user.id,
            type: msg.type || "text",
            text: msg.text || null,
            image: msg.image || null,
            location: msg.location || null,
            duration: msg.duration || null,
            reply_to: msg.replyTo || null,
            reactions: msg.reactions || []
        })
        .select()
        .single();
    if (error) throw error;
    return data;
}

async function sbLoadChatMessages(conversationId) {
    if (!_sbReady()) return [];
    const user = await sbGetUser();
    if (!user) return [];
    const { data, error } = await sb
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
    if (error) throw error;
    return (data || []).map(row => ({
        id: row.id,
        from: row.sender_id === user.id ? "me" : "them",
        type: row.type || "text",
        text: row.text || "",
        image: row.image || null,
        location: row.location || null,
        duration: row.duration || null,
        replyTo: row.reply_to || null,
        reactions: row.reactions || [],
        deleted: row.deleted || false,
        status: "read",
        ts: new Date(row.created_at).getTime()
    }));
}

let _chatSubscription = null;

function sbSubscribeChatMessages(conversationId, onNewMessage) {
    if (!_sbReady()) return;
    if (_chatSubscription) sb.removeChannel(_chatSubscription);
    sbGetUser().then(user => {
        if (!user) return;
        _chatSubscription = sb
            .channel("chat:" + conversationId)
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "chat_messages",
                filter: "conversation_id=eq." + conversationId
            }, (payload) => {
                const row = payload.new;
                if (row.sender_id === user.id) return;
                onNewMessage({
                    id: row.id,
                    from: "them",
                    type: row.type || "text",
                    text: row.text || "",
                    image: row.image || null,
                    location: row.location || null,
                    duration: row.duration || null,
                    replyTo: row.reply_to || null,
                    reactions: row.reactions || [],
                    deleted: row.deleted || false,
                    status: "read",
                    ts: new Date(row.created_at).getTime()
                });
            })
            .subscribe();
    });
}

function sbUnsubscribeChatMessages() {
    if (_chatSubscription && _sbReady()) {
        sb.removeChannel(_chatSubscription);
        _chatSubscription = null;
    }
}

// ---------- Sitter Profiles ----------

async function sbUpsertSitterProfile(profile) {
    if (!_sbReady()) return null;
    const user = await sbGetUser();
    if (!user) return null;
    const row = {
        user_id: user.id,
        name: profile.name,
        avatar: profile.avatar,
        bio: profile.bio,
        experience: profile.experience,
        response_time: profile.responseTime,
        availability: profile.availability,
        services: profile.services,
        accepted_sizes: profile.acceptedSizes,
        price_hour: profile.priceHour || null,
        price_day: profile.priceDay || null,
        price_night: profile.priceNight || null,
        city: profile.city || "",
        lat: profile.lat || null,
        lng: profile.lng || null,
        phone_verified: profile.phoneVerified || false,
        updated_at: new Date().toISOString()
    };
    const { data, error } = await sb
        .from("sitter_profiles")
        .upsert(row, { onConflict: "user_id" })
        .select()
        .single();
    if (error) throw error;
    return data;
}

async function sbLoadMySitterProfile() {
    if (!_sbReady()) return null;
    const user = await sbGetUser();
    if (!user) return null;
    const { data, error } = await sb
        .from("sitter_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
    if (error) throw error;
    return data;
}

async function sbDeleteSitterProfile() {
    if (!_sbReady()) return;
    const user = await sbGetUser();
    if (!user) return;
    await sb.from("sitter_profiles").delete().eq("user_id", user.id);
}

async function sbFindSittersNearby(lat, lng, radiusKm) {
    if (!_sbReady()) return [];
    const { data, error } = await sb.rpc("find_sitters_nearby", {
        user_lat: lat,
        user_lng: lng,
        radius_km: radiusKm || 10
    });
    if (error) throw error;
    return data || [];
}

async function sbCreateBooking(sitterProfileId, booking) {
    if (!_sbReady()) return null;
    const user = await sbGetUser();
    if (!user) return null;
    const { data, error } = await sb
        .from("sitter_bookings")
        .insert({
            client_id: user.id,
            sitter_id: sitterProfileId,
            service: booking.service,
            date_from: booking.dateFrom,
            date_to: booking.dateTo || booking.dateFrom,
            hours: booking.hours || null,
            notes: booking.notes || "",
            total: booking.total
        })
        .select()
        .single();
    if (error) throw error;
    return data;
}

async function sbUpdateBookingStatus(bookingId, status) {
    if (!_sbReady()) return;
    const { error } = await sb
        .from("sitter_bookings")
        .update({ status })
        .eq("id", bookingId);
    if (error) throw error;
}

async function sbGetSitterSubscriptionStatus() {
    if (!_sbReady()) return "inactive";
    const user = await sbGetUser();
    if (!user) return "inactive";
    const { data } = await sb
        .from("sitter_profiles")
        .select("subscription_status")
        .eq("user_id", user.id)
        .maybeSingle();
    return data?.subscription_status || "inactive";
}

// ---------- Phone Verification via Supabase Auth ----------

async function sbSendPhoneOtp(phone) {
    if (!_sbReady()) throw new Error("Supabase nicht verfügbar");
    const { error } = await sb.auth.signInWithOtp({ phone });
    if (error) throw error;
}

async function sbVerifyPhoneOtp(phone, token) {
    if (!_sbReady()) throw new Error("Supabase nicht verfügbar");
    const { data, error } = await sb.auth.verifyOtp({
        phone,
        token,
        type: "sms"
    });
    if (error) throw error;
    return data;
}
