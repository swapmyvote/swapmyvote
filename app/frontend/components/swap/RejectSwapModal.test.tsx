import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RejectSwapModal } from "@/components/swap/RejectSwapModal";
import { ApiError } from "@/lib/apiClient";

const useSwapMutation = vi.hoisted(() => vi.fn());
const cancelSwap = vi.hoisted(() => vi.fn());
vi.mock("@/lib/swap", () => ({ useSwapMutation, cancelSwap }));

describe("RejectSwapModal", () => {
  let mutateAsync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mutateAsync = vi.fn().mockResolvedValue({ swap: null, session: null });
    useSwapMutation.mockReturnValue({ mutateAsync, isPending: false });
  });

  it("warns that another partner may not be found", () => {
    render(<RejectSwapModal partnerName="Grace H" show onHide={vi.fn()} />);

    expect(
      screen.getByText("Are you sure you want to reject Grace H?"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/can't be sure that we'll find anyone else/),
    ).toBeInTheDocument();
  });

  it("rejects the swap when confirmed", async () => {
    render(<RejectSwapModal partnerName="Grace H" show onHide={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Reject" }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith(undefined));
  });

  it("closes without rejecting when cancelled", async () => {
    const onHide = vi.fn();
    render(<RejectSwapModal partnerName="Grace H" show onHide={onHide} />);

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onHide).toHaveBeenCalled();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("reports a failed rejection inside the modal", async () => {
    mutateAsync.mockRejectedValue(
      new ApiError(422, {
        error: {
          code: "swap_not_found",
          messages: ["That swap could not be found"],
          fields: {},
        },
      }),
    );
    render(<RejectSwapModal partnerName="Grace H" show onHide={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Reject" }));

    await waitFor(() =>
      expect(
        screen.getByText("That swap could not be found"),
      ).toBeInTheDocument(),
    );
  });
});
