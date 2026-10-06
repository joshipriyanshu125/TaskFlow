import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";

process.env.RESEND_API_KEY = "test-resend-api-key";
process.env.EMAIL_FROM = "TaskFlow <no-reply@example.com>";

const { sendEmail } = await import("../src/services/email.js");
const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("Resend email transport", () => {
  it("sends email through the HTTPS API", async () => {
    let requestUrl;
    let requestOptions;
    globalThis.fetch = async (url, options) => {
      requestUrl = url;
      requestOptions = options;
      return {
        ok: true,
        json: async () => ({ id: "email_test_123" })
      };
    };

    const result = await sendEmail({
      to: "recipient@example.com",
      subject: "TaskFlow test",
      html: "<p>Hello</p>"
    });

    assert.equal(requestUrl, "https://api.resend.com/emails");
    assert.equal(requestOptions.headers.Authorization, "Bearer test-resend-api-key");
    assert.deepEqual(JSON.parse(requestOptions.body), {
      from: "TaskFlow <no-reply@example.com>",
      to: ["recipient@example.com"],
      subject: "TaskFlow test",
      text: "Hello",
      html: "<p>Hello</p>"
    });
    assert.deepEqual(result, { success: true, messageId: "email_test_123" });
  });

  it("returns the provider error when the API rejects a send", async () => {
    globalThis.fetch = async () => ({
      ok: false,
      status: 422,
      json: async () => ({ message: "The sender domain is not verified." })
    });

    const result = await sendEmail({
      to: "recipient@example.com",
      subject: "TaskFlow test",
      text: "Hello"
    });

    assert.deepEqual(result, {
      success: false,
      error: "The sender domain is not verified."
    });
  });
});
