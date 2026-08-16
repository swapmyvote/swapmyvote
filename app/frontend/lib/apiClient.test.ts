import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiClient } from "@/lib/apiClient";

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status });
}

function setCsrfMeta(token: string | null) {
  document.head.innerHTML =
    token === null ? "" : `<meta name="csrf-token" content="${token}">`;
}

function lastRequestInit(): RequestInit {
  const mock = vi.mocked(global.fetch);
  return mock.mock.calls[mock.mock.calls.length - 1][1] as RequestInit;
}

function lastRequestHeaders(): Record<string, string> {
  return lastRequestInit().headers as Record<string, string>;
}

async function rejection(promise: Promise<unknown>): Promise<ApiError> {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ApiError);
  return error as ApiError;
}

describe("apiClient", () => {
  beforeEach(() => {
    setCsrfMeta("test-csrf-token");
    // A fresh Response per call: a Response body can only be read once, and
    // several examples make more than one request.
    global.fetch = vi.fn(async () => jsonResponse(200, { ok: true }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.head.innerHTML = "";
  });

  it("prefixes paths with the versioned API root", async () => {
    await apiClient.get("/session");

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/v1/session",
      expect.anything(),
    );
  });

  it("sends the session cookie", async () => {
    await apiClient.get("/session");

    expect(lastRequestInit().credentials).toBe("same-origin");
  });

  it("does not send a CSRF token on GET", async () => {
    await apiClient.get("/session");

    expect(lastRequestHeaders()).not.toHaveProperty("X-CSRF-Token");
  });

  it("sends the CSRF token from the meta tag on every non-GET", async () => {
    await apiClient.delete("/session");
    expect(lastRequestHeaders()["X-CSRF-Token"]).toBe("test-csrf-token");

    await apiClient.post("/session", { a: 1 });
    expect(lastRequestHeaders()["X-CSRF-Token"]).toBe("test-csrf-token");
  });

  it("reads the CSRF token afresh each request, in case Rails rotates it", async () => {
    await apiClient.post("/session");
    setCsrfMeta("rotated-token");
    await apiClient.post("/session");

    expect(lastRequestHeaders()["X-CSRF-Token"]).toBe("rotated-token");
  });

  it("omits the CSRF header when the page has no token", async () => {
    setCsrfMeta(null);

    await apiClient.post("/session");

    expect(lastRequestHeaders()).not.toHaveProperty("X-CSRF-Token");
  });

  it("serializes a JSON body and sets the content type", async () => {
    await apiClient.post("/session", { name: "Ada" });

    expect(lastRequestInit().body).toBe('{"name":"Ada"}');
    expect(lastRequestHeaders()["Content-Type"]).toBe("application/json");
  });

  it("sends no body, and no content type, when there is nothing to send", async () => {
    await apiClient.delete("/session");

    expect(lastRequestInit().body).toBeUndefined();
    expect(lastRequestHeaders()).not.toHaveProperty("Content-Type");
  });

  it("returns the parsed response body", async () => {
    vi.mocked(global.fetch).mockImplementation(async () =>
      jsonResponse(200, { appMode: "open" }),
    );

    await expect(apiClient.get("/session")).resolves.toEqual({
      appMode: "open",
    });
  });

  it("returns null for an empty (204) body", async () => {
    vi.mocked(global.fetch).mockImplementation(
      async () => new Response(null, { status: 204 }),
    );

    await expect(apiClient.get("/session")).resolves.toBeNull();
  });

  it("throws an ApiError carrying the server's error convention", async () => {
    vi.mocked(global.fetch).mockImplementation(async () =>
      jsonResponse(422, {
        error: {
          code: "validation_failed",
          messages: ["Name can't be blank"],
          fields: { name: ["can't be blank"] },
        },
      }),
    );

    const error = await rejection(apiClient.post("/session"));

    expect(error.status).toBe(422);
    expect(error.code).toBe("validation_failed");
    expect(error.messages).toEqual(["Name can't be blank"]);
    expect(error.fields).toEqual({ name: ["can't be blank"] });
    // The first server message is the human-readable one, so it becomes the
    // Error's own message.
    expect(error.message).toBe("Name can't be blank");
  });

  it("flags a 401 as unauthenticated", async () => {
    vi.mocked(global.fetch).mockImplementation(async () =>
      jsonResponse(401, {
        error: { code: "unauthenticated", messages: ["Log in"], fields: {} },
      }),
    );

    const error = await rejection(apiClient.get("/session"));

    expect(error.isUnauthenticated).toBe(true);
  });

  it("still throws an ApiError when the error body is not JSON", async () => {
    vi.mocked(global.fetch).mockImplementation(
      async () => new Response("<html>502 Bad Gateway</html>", { status: 502 }),
    );

    const error = await rejection(apiClient.get("/session"));

    expect(error.status).toBe(502);
    expect(error.code).toBe("unknown_error");
    expect(error.message).toBe("Request failed with status 502");
  });
});
