import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ShareEmailConsentForm } from "@/components/swap/ShareEmailConsentForm";

const useSwapMutation = vi.hoisted(() => vi.fn());
const shareEmail = vi.hoisted(() => vi.fn());
vi.mock("@/lib/swap", () => ({ useSwapMutation, shareEmail }));

describe("ShareEmailConsentForm", () => {
  let mutateAsync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mutateAsync = vi.fn().mockResolvedValue({ swap: {}, session: null });
    useSwapMutation.mockReturnValue({ mutateAsync, isPending: false });
  });

  it("uses the label and button text it is given", () => {
    render(
      <ShareEmailConsentForm
        label="Share my email address with Grace Hopper"
        submitLabel="Share with Grace Hopper"
      />,
    );

    expect(
      screen.getByRole("checkbox", {
        name: "Share my email address with Grace Hopper",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Share with Grace Hopper" }),
    ).toBeInTheDocument();
  });

  it("does nothing until the box is ticked", async () => {
    render(<ShareEmailConsentForm label="Share it" submitLabel="Share" />);

    await userEvent.click(screen.getByRole("button", { name: "Share" }));

    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("records consent when ticked", async () => {
    render(<ShareEmailConsentForm label="Share it" submitLabel="Share" />);

    await userEvent.click(screen.getByRole("checkbox", { name: "Share it" }));
    await userEvent.click(screen.getByRole("button", { name: "Share" }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith(undefined));
  });

  it("reports a failure rather than pretending it worked", async () => {
    mutateAsync.mockRejectedValue(new Error("boom"));
    render(<ShareEmailConsentForm label="Share it" submitLabel="Share" />);

    await userEvent.click(screen.getByRole("checkbox", { name: "Share it" }));
    await userEvent.click(screen.getByRole("button", { name: "Share" }));

    await waitFor(() =>
      expect(
        screen.getByText("Something went wrong - please try that again."),
      ).toBeInTheDocument(),
    );
  });
});
