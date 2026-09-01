const test = require("node:test");
const assert = require("node:assert/strict");
const { findOrCreateGoogleCustomer } = require("./googleCustomer");

function mockUsers(initial = []) {
  const docs = initial.map((d) => ({ ...d }));
  return {
    docs,
    async findOne(query) {
      return docs.find((d) => Object.entries(query).every(([k, v]) => d[k] === v)) || null;
    },
    async insertOne(doc) {
      if (docs.some((d) => d.email === doc.email || (doc.google_id && d.google_id === doc.google_id))) {
        const err = new Error("duplicate");
        err.code = 11000;
        throw err;
      }
      docs.push({ ...doc });
      return { insertedId: doc.id };
    },
    async updateOne(query, update) {
      const doc = docs.find((d) => Object.entries(query).every(([k, v]) => d[k] === v));
      if (!doc) return { modifiedCount: 0 };
      Object.assign(doc, update.$set || {});
      return { modifiedCount: 1 };
    },
  };
}

const googleJohn = {
  sub: "google-sub-john",
  email: "john@gmail.com",
  email_verified: true,
  name: "John Doe",
  picture: "https://example.com/john.png",
};

test("creates a new customer with role forced to customer", async () => {
  const users = mockUsers();
  const result = await findOrCreateGoogleCustomer(users, {
    ...googleJohn,
    role: "admin",
  });
  assert.equal(result.created, true);
  assert.equal(result.user.role, "customer");
  assert.equal(result.user.google_id, "google-sub-john");
  assert.equal(result.user.email, "john@gmail.com");
  assert.equal(result.user.auth_provider, "google");
  assert.equal(result.user.phone, null);
});

test("logs in an existing google_id without creating a duplicate", async () => {
  const existing = {
    id: "u1",
    google_id: "google-sub-john",
    email: "john@gmail.com",
    name: "John",
    role: "customer",
    phone: "9876543210",
  };
  const users = mockUsers([existing]);
  const result = await findOrCreateGoogleCustomer(users, googleJohn);
  assert.equal(result.created, false);
  assert.equal(result.linked, false);
  assert.equal(result.user.id, "u1");
  assert.equal(users.docs.length, 1);
  assert.equal(users.docs[0].phone, "9876543210");
});

test("repairs a google user missing customer role", async () => {
  const existing = {
    id: "u-role",
    google_id: "google-sub-john",
    email: "john@gmail.com",
    name: "John",
    role: "user",
  };
  const users = mockUsers([existing]);
  const result = await findOrCreateGoogleCustomer(users, googleJohn);
  assert.equal(result.created, false);
  assert.equal(result.user.role, "customer");
  assert.equal(users.docs[0].role, "customer");
});

test("links google_id onto an existing email customer and preserves data", async () => {
  const existing = {
    id: "u2",
    email: "john@gmail.com",
    name: "John",
    phone: "9876543210",
    password_hash: "hashed",
    role: "customer",
    address: "12 Main St",
  };
  const users = mockUsers([existing]);
  const result = await findOrCreateGoogleCustomer(users, googleJohn);
  assert.equal(result.created, false);
  assert.equal(result.linked, true);
  assert.equal(users.docs.length, 1);
  assert.equal(result.user.google_id, "google-sub-john");
  assert.equal(result.user.phone, "9876543210");
  assert.equal(result.user.name, "John");
  assert.equal(result.user.password_hash, "hashed");
  assert.equal(result.user.address, "12 Main St");
  assert.equal(result.user.role, "customer");
});

test("does not authenticate an admin via Google even with matching email", async () => {
  const users = mockUsers([{
    id: "admin-1",
    email: "admin@example.com",
    role: "admin",
    password_hash: "hashed",
  }]);
  const result = await findOrCreateGoogleCustomer(users, {
    sub: "google-admin",
    email: "admin@example.com",
    email_verified: true,
    name: "Admin",
  });
  assert.equal(result.error, "admin_not_allowed");
  assert.equal(users.docs[0].google_id, undefined);
});

test("does not link an unverified Google email to an existing customer", async () => {
  const users = mockUsers([{
    id: "u3",
    email: "john@gmail.com",
    name: "John",
    role: "customer",
  }]);
  const result = await findOrCreateGoogleCustomer(users, {
    ...googleJohn,
    email_verified: false,
  });
  assert.equal(result.error, "email_unverified");
  assert.equal(users.docs[0].google_id, undefined);
  assert.equal(users.docs.length, 1);
});

test("rejects new accounts when Google email is not verified", async () => {
  const users = mockUsers();
  const result = await findOrCreateGoogleCustomer(users, {
    ...googleJohn,
    email_verified: false,
  });
  assert.equal(result.error, "email_unverified");
  assert.equal(users.docs.length, 0);
});

test("does not take over an email already linked to a different Google account", async () => {
  const users = mockUsers([{
    id: "u4",
    email: "john@gmail.com",
    google_id: "other-sub",
    role: "customer",
  }]);
  const result = await findOrCreateGoogleCustomer(users, googleJohn);
  assert.equal(result.error, "email_in_use");
  assert.equal(users.docs[0].google_id, "other-sub");
});
