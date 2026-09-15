import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/apiClient";
import { requestPasswordReset } from "@/lib/password";
import { PasswordNew } from "@/pages/PasswordNew";
import { sessionValue, TestSessionProvider } from "@/test/sessionFixtures";

vi.mock("@/lib/password", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/password")>();
  return { ...actual, requestPasswordReset: vi.fn() };
});

function renderPage() {
  render(
    <TestSessionProvider value={sessionValue()}>
      <MemoryRouter>
        <PasswordNew />
      </MemoryRouter>
    </TestSessionProvider>,
  );
}

async function submit(email = "ada@example.com") {
  await userEvent.type(screen.getByLabelText("Email"), email);
  await userEvent.click(
    screen.getByRole("button", { name: "Send reset instructions" }),
  );
}

describe("PasswordNew", () => {
  beforeEach(() => {
    vi.mocked(requestPasswordReset).mockReset();
  });

  it("renders the form", () => {
    renderPage();

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Send reset instructions" }),
    ).toBeInTheDocument();
  });

  it("requests a reset for the typed address", async () => {
    vi.mocked(requestPasswordReset).mockResolvedValue({ status: "accepted" });
    renderPage();

    await submit("ada@example.com");

    expect(requestPasswordReset).toHaveBeenCalledWith("ada@example.com");
  });

  it("shows a conditional confirmation that does not reveal whether the account exists", async () => {
    vi.mocked(requestPasswordReset).mockResolvedValue({ status: "accepted" });
    renderPage();

    await submit();

    const confirmation = await screen.findByText(
      /we've sent reset instructions/i,
    );
    expect(confirmation.textContent).toMatch(/if that address is registered/i);
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
  });

  it("surfaces an error instead of the confirmation when the request fails", async () => {
    vi.mocked(requestPasswordReset).mockRejectedValue(
      new ApiError(422, {
        error: {
          code: "validation_failed",
          messages: ["Something went wrong"],
          fields: {},
        },
      }),
    );
    renderPage();

    await submit();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong",
    );
    expect(
      screen.queryByText(/we've sent reset instructions/i),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });
});
