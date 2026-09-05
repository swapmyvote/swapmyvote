import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "@/components/forms/ConfirmDialog";

function renderDialog(overrides = {}) {
  const props = {
    ariaLabel: "Reject Bob",
    show: true,
    onHide: vi.fn(),
    onConfirm: vi.fn(),
    confirmLabel: "Reject",
    ...overrides,
  };
  render(
    <ConfirmDialog {...props}>
      <p>Are you sure?</p>
    </ConfirmDialog>,
  );
  return props;
}

describe("ConfirmDialog", () => {
  it("names itself for assistive tech and shows its body", () => {
    renderDialog();

    expect(screen.getByRole("dialog", { name: "Reject Bob" })).toBeVisible();
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
  });

  // The whole reason this is a component: cancel then confirm, confirm
  // rightmost, in a right-aligned row — a caller cannot render them the other
  // way round because it does not supply the footer.
  it("orders the footer cancel-then-confirm in a right-aligned row", () => {
    renderDialog();

    const labels = screen.getAllByRole("button").map((b) => b.textContent);
    expect(labels).toEqual(["Cancel", "Reject"]);

    const confirm = screen.getByRole("button", { name: "Reject" });
    expect(confirm.parentElement).toHaveClass("justify-content-end");
  });

  it("confirms and cancels through the callbacks it is given", async () => {
    const props = renderDialog();

    await userEvent.click(screen.getByRole("button", { name: "Reject" }));
    expect(props.onConfirm).toHaveBeenCalledOnce();

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(props.onHide).toHaveBeenCalledOnce();
  });

  it("disables only the confirm while a mutation is in flight", () => {
    renderDialog({ confirmDisabled: true });

    expect(screen.getByRole("button", { name: "Reject" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
  });

  // $danger is gray-900 in this theme, so a "danger" confirm would read as
  // ordinary dark ink — the component deliberately offers no such variant.
  it("renders the confirm as the primary action", () => {
    renderDialog();

    expect(screen.getByRole("button", { name: "Reject" })).toHaveClass(
      "btn-primary",
    );
  });

  it("lets the caller rename cancel", () => {
    renderDialog({ cancelLabel: "Keep it" });

    expect(screen.getByRole("button", { name: "Keep it" })).toBeInTheDocument();
  });
});
