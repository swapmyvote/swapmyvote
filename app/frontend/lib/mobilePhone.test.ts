import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/lib/apiClient";
import { confirmVerification, sendVerification } from "@/lib/mobilePhone";
import { sessionPayload, testUser } from "@/test/sessionFixtures";

vi.mock("@/lib/apiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/apiClient")>();
  return { ...actual, apiClient: { ...actual.apiClient, post: vi.fn() } };
});

describe("sendVerification", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
    vi.mocked(apiClient.post).mockResolvedValue({
      number: "+447911123456",
      sent: true,
    });
  });

  it("posts the number", async () => {
    const sent = await sendVerification("+447911123456");

    expect(apiClient.post).toHaveBeenCalledWith("/mobile_phone/verifications", {
      number: "+447911123456",
    });
    expect(sent.number).toBe("+447911123456");
  });

  // The endpoint treats a missing number as "re-send to the one on file".
  it("posts an empty body when no number is given", async () => {
    await sendVerification();

    expect(apiClient.post).toHaveBeenCalledWith(
      "/mobile_phone/verifications",
      {},
    );
  });
});

describe("confirmVerification", () => {
  it("posts the token and returns the session payload", async () => {
    const payload = sessionPayload({ currentUser: testUser });
    vi.mocked(apiClient.post).mockReset();
    vi.mocked(apiClient.post).mockResolvedValue(payload);

    const session = await confirmVerification("123456");

    expect(apiClient.post).toHaveBeenCalledWith(
      "/mobile_phone/verifications/confirm",
      { token: "123456" },
    );
    expect(session).toEqual(payload);
  });
});
