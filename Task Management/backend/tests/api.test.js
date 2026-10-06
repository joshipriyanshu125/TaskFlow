
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const BASE_URL = process.env.API_URL || "http://localhost:5000";

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers }
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

describe("Health Check", () => {
  it("should return ok status with service details", async () => {
    const { status, body } = await request("/health");
    assert.equal(status, 200);
    assert.equal(body.status, "ok");
    assert.ok(body.services);
    assert.ok(body.services.database);
    assert.ok(body.services.redis);
    assert.ok(body.timestamp);
  });
});

describe("Authentication", () => {
  const testUser = {
    name: "Test Runner",
    email: `test-${Date.now()}@test.local`,
    password: "securePassword123"
  };
  let token;

  it("should reject signup with short password", async () => {
    const { status } = await request("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ ...testUser, password: "short" })
    });
    assert.equal(status, 400);
  });

  it("should signup successfully", async () => {
    const { status, body } = await request("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(testUser)
    });
    assert.equal(status, 201);
    assert.ok(body.token);
    assert.ok(body.refreshToken);
    assert.equal(body.user.email, testUser.email);
    token = body.token;
  });

  it("should reject duplicate signup", async () => {
    const { status } = await request("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(testUser)
    });
    assert.equal(status, 409);
  });

  it("should signin successfully", async () => {
    const { status, body } = await request("/api/auth/signin", {
      method: "POST",
      body: JSON.stringify({ email: testUser.email, password: testUser.password })
    });
    assert.equal(status, 200);
    assert.ok(body.token);
    assert.ok(body.refreshToken);
  });

  it("should reject wrong password", async () => {
    const { status } = await request("/api/auth/signin", {
      method: "POST",
      body: JSON.stringify({ email: testUser.email, password: "wrongPassword123" })
    });
    assert.equal(status, 401);
  });

  it("should get current user profile via /auth/me", async () => {
    const { status, body } = await request("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(status, 200);
    assert.equal(body.user.email, testUser.email);
    assert.equal(body.user.name, testUser.name);
  });

  it("should refresh token successfully", async () => {
    // First get a refresh token
    const signin = await request("/api/auth/signin", {
      method: "POST",
      body: JSON.stringify({ email: testUser.email, password: testUser.password })
    });

    const { status, body } = await request("/api/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken: signin.body.refreshToken })
    });
    assert.equal(status, 200);
    assert.ok(body.token);
  });
});

describe("Protected Routes", () => {
  it("should reject unauthenticated task requests", async () => {
    const { status } = await request("/api/tasks");
    assert.equal(status, 401);
  });

  it("should reject invalid tokens", async () => {
    const { status } = await request("/api/tasks", {
      headers: { Authorization: "Bearer invalid-token-here" }
    });
    assert.equal(status, 401);
  });

  it("should reject unauthenticated workspace requests", async () => {
    const { status } = await request("/api/workspaces");
    assert.equal(status, 401);
  });
});

describe("Input Validation", () => {
  let token;

  it("setup: create test user", async () => {
    const { body } = await request("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "Validation Test",
        email: `validation-${Date.now()}@test.local`,
        password: "securePassword123"
      })
    });
    token = body.token;
  });

  it("should reject task with empty title", async () => {
    const { status } = await request("/api/tasks", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: "" })
    });
    assert.equal(status, 400);
  });

  it("should reject signup with invalid email", async () => {
    const { status } = await request("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name: "Test", email: "not-an-email", password: "securePassword123" })
    });
    assert.equal(status, 400);
  });
});
