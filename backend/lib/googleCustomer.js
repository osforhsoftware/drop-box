const crypto = require("crypto");
const { validateEmail, clampString } = require("./security");

function nowIso() {
  return new Date().toISOString();
}

function displayName(name, email) {
  const cleaned = clampString(name, 100);
  if (cleaned) return cleaned;
  const local = String(email || "").split("@")[0];
  return clampString(local, 100) || "Customer";
}

async function findOrCreateGoogleCustomer(users, identity, options = {}) {
  const sub = String(identity?.sub || "").trim();
  if (!sub) return { error: "missing_identity" };

  const emailNorm = validateEmail(identity.email);
  const emailVerified = identity.email_verified === true;
  const picture = identity.picture ? clampString(identity.picture, 500) : "";

  const byGoogle = await users.findOne({ google_id: sub });
  if (byGoogle) {
    if (byGoogle.role === "admin") return { error: "admin_not_allowed" };
    const refresh = {};
    if (picture && !byGoogle.profile_picture) refresh.profile_picture = picture;
    if (emailVerified) refresh.email_verified = true;
    if (byGoogle.role !== "customer") refresh.role = "customer";
    if (Object.keys(refresh).length) {
      refresh.updated_at = nowIso();
      await users.updateOne({ id: byGoogle.id }, { $set: refresh });
      return { user: { ...byGoogle, ...refresh }, created: false, linked: false };
    }
    return { user: byGoogle, created: false, linked: false };
  }

  if (emailNorm && emailVerified) {
    const byEmail = await users.findOne({ email: emailNorm });
    if (byEmail) {
      if (byEmail.role === "admin") return { error: "admin_not_allowed" };
      if (byEmail.google_id && byEmail.google_id !== sub) {
        return { error: "email_in_use" };
      }
      const link = {
        google_id: sub,
        email_verified: true,
        role: "customer",
        updated_at: nowIso(),
      };
      if (!byEmail.profile_picture && picture) link.profile_picture = picture;
      if (!byEmail.auth_provider) link.auth_provider = "google";
      await users.updateOne({ id: byEmail.id }, { $set: link });
      return { user: { ...byEmail, ...link }, created: false, linked: true };
    }
  } else if (emailNorm && !emailVerified) {
    const existing = await users.findOne({ email: emailNorm });
    if (existing) return { error: "email_unverified" };
    return { error: "email_unverified" };
  }

  if (!emailNorm) return { error: "email_required" };
  if (!emailVerified) return { error: "email_unverified" };

  if (typeof options.canCreate === "function") {
    const allowed = await options.canCreate();
    if (!allowed) return { error: "rate_limit" };
  }

  const user = {
    id: crypto.randomUUID(),
    google_id: sub,
    email: emailNorm,
    email_verified: true,
    name: displayName(identity.name, emailNorm),
    profile_picture: picture || null,
    phone: null,
    role: "customer",
    auth_provider: "google",
    address: null,
    state: null,
    pincode: null,
    created_at: nowIso(),
  };

  try {
    await users.insertOne(user);
    if (typeof options.onCreated === "function") await options.onCreated(user);
    return { user, created: true, linked: false };
  } catch (err) {
    if (err && err.code === 11000) {
      const raced = (await users.findOne({ google_id: sub }))
        || (await users.findOne({ email: emailNorm }));
      if (raced) {
        if (raced.role === "admin") return { error: "admin_not_allowed" };
        return { user: raced, created: false, linked: Boolean(raced.google_id) };
      }
    }
    throw err;
  }
}

module.exports = {
  findOrCreateGoogleCustomer,
};
