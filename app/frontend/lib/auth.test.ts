import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/lib/apiClient";
import { logIn, postAuthPath, signUp } from "@/lib/auth";
import { spaPaths } from "@/lib/spaPaths";
import { sessionPayload, testUser } from "@/test/sessionFixtures";

vi.mock("@/lib/apiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/apiClient")>();
  return { ...actual, apiClient: { post: vi.fn() } };
});

describe("logIn", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
    vi.mocked(apiClient.post).mockResolvedValue(sessionPayload());
  });

  it("posts the credentials to the session endpoint", async () => {
    await logIn({ email: "ada@example.com", password: "correct-horse" });

    expect(apiClient.post).toHaveBeenCalledWith("/session", {
      email: "ada@example.com",
      password: "correct-horse",
    });
  });
});

describe("signUp", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
    vi.mocked(apiClient.post).mockResolvedValue(sessionPayload());
  });

  // The camelCase names stop at this boundary: Rails strong parameters read
  // snake_case.
  it("posts snake_case attributes to the registration endpoint", async () => {
    await signUp({
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "correct-horse",
      passwordConfirmation: "correct-horse",
      consentNewsEmail: true,
      consentToDataProcessing: true,
      swapReference: "",
    });

    expect(apiClient.post).toHaveBeenCalledWith("/registration", {
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "correct-horse",
      password_confirmation: "correct-horse",
      consent_news_email: true,
      consent_to_data_processing: true,
      swap_reference: "",
    });
  });
});

describe("postAuthPath", () => {
  it("sends an account with no constituency to the constituency screen", () => {
    const session = sessionPayload({
      currentUser: { ...testUser, hasConstituency: false },
    });

    expect(postAuthPath(session)).toBe(spaPaths.constituency);
  });

  it("sends a complete account home", () => {
    const session = sessionPayload({ currentUser: testUser });

    expect(postAuthPath(session)).toBe(spaPaths.home);
  });

  it("sends a payload with no user home rather than nowhere", () => {
    expect(postAuthPath(sessionPayload())).toBe(spaPaths.home);
  });
});
