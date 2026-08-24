import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/lib/apiClient";
import { updateProfile, useConstituencyDetail } from "@/lib/profile";
import type { ConstituencyDetail } from "@/types/api";

vi.mock("@/lib/apiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/apiClient")>();
  return {
    ...actual,
    apiClient: { get: vi.fn(), patch: vi.fn() },
  };
});

const detail: ConstituencyDetail = {
  onsId: "E14001063",
  name: "Woking",
  polls: [],
};

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("updateProfile", () => {
  beforeEach(() => {
    vi.mocked(apiClient.patch).mockReset();
  });

  it("sends the fields the API names, in snake_case", async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({
      user: null,
      reviewRequired: false,
    });

    await updateProfile({
      preferredPartyId: "1",
      willingPartyId: "2",
      constituencyOnsId: "E14001063",
      email: "voter@example.com",
    });

    expect(apiClient.patch).toHaveBeenCalledWith("/user", {
      preferred_party_id: "1",
      willing_party_id: "2",
      constituency_ons_id: "E14001063",
      email: "voter@example.com",
    });
  });

  it("omits fields the caller left out rather than sending undefined", async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({
      user: null,
      reviewRequired: false,
    });

    await updateProfile({ constituencyOnsId: "E14001063" });

    expect(apiClient.patch).toHaveBeenCalledWith("/user", {
      constituency_ons_id: "E14001063",
    });
  });
});

describe("useConstituencyDetail", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
  });

  it("fetches the constituency by ONS id", async () => {
    vi.mocked(apiClient.get).mockResolvedValue(detail);

    const { result } = renderHook(() => useConstituencyDetail("E14001063"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.data).toEqual(detail));
    expect(apiClient.get).toHaveBeenCalledWith("/constituencies/E14001063");
  });

  it("does not fetch until there is an ONS id", () => {
    renderHook(() => useConstituencyDetail(null), { wrapper });

    expect(apiClient.get).not.toHaveBeenCalled();
  });
});
