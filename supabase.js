/* ============================================================
   PfotenMatch – Supabase Integration
   ============================================================ */

const SUPABASE_URL = "https://qgmccuouetouzhpfynwq.supabase.co";
const SUPABASE_KEY = "sb_publishable_M6FwQhVrmkVBx9GUbmURYg_m2YBidkN";

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ---------- Auth Helpers ----------

async function sbSignUp(email, password) {
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) throw error;
    return data;
}

async function sbSignIn(email, password) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
}

async function sbSignOut() {
    const { error } = await sb.auth.signOut();
    if (error) throw error;
}

async function sbGetUser() {
    const { data: { user } } = await sb.auth.getUser();
    return user;
}

async function sbGetSession() {
    const { data: { session } } = await sb.auth.getSession();
    return session;
}

// ---------- Dog Profile ----------

async function sbUpsertProfile(profile) {
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
        photos: data.photos || []
    };
}

// ---------- Matches ----------

async function sbSaveMatch(dogId) {
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
    const user = await sbGetUser();
    if (!user) return;
    await sb.from("matches").delete().eq("user_id", user.id).eq("dog_id", dogId);
}

// ---------- Messages ----------

async function sbSaveMessage(matchDbId, msg) {
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
    if (_messageSubscription) {
        sb.removeChannel(_messageSubscription);
        _messageSubscription = null;
    }
}

// ---------- Match DB ID Cache ----------
const _matchDbIds = {};

async function sbGetMatchDbId(dogId) {
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
    const code = generateFriendCode(userId);
    await sb.from("dog_profiles")
        .update({ friend_code: code })
        .eq("user_id", userId);
    return code;
}

async function sbFindByFriendCode(code) {
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
