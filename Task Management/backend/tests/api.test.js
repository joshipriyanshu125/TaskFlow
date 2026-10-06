
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
  it("should return API information at the root URL", async () => {
    const { status, body } = await request("/");
    assert.equal(status, 200);
    assert.equal(body.name, "TaskFlow API");
    assert.equal(body.health, "/health");
  });

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

describe("Workspace Member Management", () => {
  it("allows workspace admins and owners to remove members with role protections", async () => {
    const password = "securePassword123";
    const createUser = async (name) => {
      const { status, body } = await request("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          name,
          email: `workspace-${name.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2)}@test.local`,
          password
        })
      });
      assert.equal(status, 201);
      return body;
    };
    const authenticated = (token) => ({ Authorization: `Bearer ${token}` });

    const owner = await createUser("Workspace Owner");
    const admin = await createUser("Workspace Admin");
    const member = await createUser("Workspace Member");

    const workspaceResponse = await request("/api/workspaces", {
      method: "POST",
      headers: authenticated(owner.token),
      body: JSON.stringify({ name: "Member Removal Test" })
    });
    assert.equal(workspaceResponse.status, 201);
    const workspaceId = workspaceResponse.body.workspace._id;

    for (const [user, role] of [[admin, "admin"], [member, "member"]]) {
      const inviteResponse = await request(`/api/workspaces/${workspaceId}/members`, {
        method: "POST",
        headers: authenticated(owner.token),
        body: JSON.stringify({ email: user.user.email, role })
      });
      assert.equal(inviteResponse.status, 201);
    }

    const memberCannotGrantAdmin = await request(`/api/workspaces/${workspaceId}/members`, {
      method: "POST",
      headers: authenticated(member.token),
      body: JSON.stringify({ email: `not-added-${Date.now()}@test.local`, role: "admin" })
    });
    assert.equal(memberCannotGrantAdmin.status, 403);

    const memberCannotRemoveAdmin = await request(`/api/workspaces/${workspaceId}/members/${admin.user.id}`, {
      method: "DELETE",
      headers: authenticated(member.token)
    });
    assert.equal(memberCannotRemoveAdmin.status, 403);

    const adminCannotRemoveOwner = await request(`/api/workspaces/${workspaceId}/members/${owner.user.id}`, {
      method: "DELETE",
      headers: authenticated(admin.token)
    });
    assert.equal(adminCannotRemoveOwner.status, 403);

    const adminRemoval = await request(`/api/workspaces/${workspaceId}/members/${member.user.id}`, {
      method: "DELETE",
      headers: authenticated(admin.token)
    });
    assert.equal(adminRemoval.status, 204);

    const ownerRemoval = await request(`/api/workspaces/${workspaceId}/members/${admin.user.id}`, {
      method: "DELETE",
      headers: authenticated(owner.token)
    });
    assert.equal(ownerRemoval.status, 204);

    const ownerCannotRemoveSelf = await request(`/api/workspaces/${workspaceId}/members/${owner.user.id}`, {
      method: "DELETE",
      headers: authenticated(owner.token)
    });
    assert.equal(ownerCannotRemoveSelf.status, 403);

    const deleteWorkspace = await request(`/api/workspaces/${workspaceId}`, {
      method: "DELETE",
      headers: authenticated(owner.token)
    });
    assert.equal(deleteWorkspace.status, 204);
  });
});

describe("Team Member Management", () => {
  it("allows workspace owners and admins to remove team members", async () => {
    const createUser = async (name) => {
      const { status, body } = await request("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          name,
          email: `team-${name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}-${Math.random().toString(36).slice(2)}@test.local`,
          password: "securePassword123"
        })
      });
      assert.equal(status, 201);
      return body;
    };
    const authenticated = (token) => ({ Authorization: `Bearer ${token}` });

    const owner = await createUser("Team Owner");
    const admin = await createUser("Team Admin");
    const member = await createUser("Team Member");

    const workspaceResponse = await request("/api/workspaces", {
      method: "POST",
      headers: authenticated(owner.token),
      body: JSON.stringify({ name: "Team Removal Test" })
    });
    assert.equal(workspaceResponse.status, 201);
    const workspaceId = workspaceResponse.body.workspace._id;

    for (const [user, role] of [[admin, "admin"], [member, "member"]]) {
      const inviteResponse = await request(`/api/workspaces/${workspaceId}/members`, {
        method: "POST",
        headers: authenticated(owner.token),
        body: JSON.stringify({ email: user.user.email, role })
      });
      assert.equal(inviteResponse.status, 201);
    }

    const teamResponse = await request("/api/teams", {
      method: "POST",
      headers: authenticated(owner.token),
      body: JSON.stringify({ workspaceId, name: "Member Removal Team" })
    });
    assert.equal(teamResponse.status, 201);
    const teamId = teamResponse.body.team._id;

    const inviteToTeam = await request(`/api/teams/${teamId}/invite`, {
      method: "POST",
      headers: authenticated(owner.token),
      body: JSON.stringify({ email: member.user.email })
    });
    assert.equal(inviteToTeam.status, 201);
    const inviteAdminToTeam = await request(`/api/teams/${teamId}/invite`, {
      method: "POST",
      headers: authenticated(owner.token),
      body: JSON.stringify({ email: admin.user.email })
    });
    assert.equal(inviteAdminToTeam.status, 201);

    const teamAdminRemoval = await request(`/api/teams/${teamId}/members/${member.user.id}`, {
      method: "DELETE",
      headers: authenticated(admin.token)
    });
    assert.equal(teamAdminRemoval.status, 204);

    const teamOwnerRemoval = await request(`/api/teams/${teamId}/members/${admin.user.id}`, {
      method: "DELETE",
      headers: authenticated(owner.token)
    });
    assert.equal(teamOwnerRemoval.status, 204);

    const listedWorkspaces = await request("/api/workspaces", {
      headers: authenticated(owner.token)
    });
    assert.equal(listedWorkspaces.status, 200);
    assert.ok(listedWorkspaces.body.workspaces.some((workspace) => workspace._id === workspaceId));

    const removeTeam = await request(`/api/teams/${teamId}`, {
      method: "DELETE",
      headers: authenticated(owner.token)
    });
    assert.equal(removeTeam.status, 204);

    const removeWorkspace = await request(`/api/workspaces/${workspaceId}`, {
      method: "DELETE",
      headers: authenticated(owner.token)
    });
    assert.equal(removeWorkspace.status, 204);
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
