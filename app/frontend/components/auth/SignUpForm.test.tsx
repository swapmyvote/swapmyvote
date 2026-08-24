import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { ApiError } from "@/lib/apiClient";
import { signUp } from "@/lib/auth";
import { sessionPayload, testUser } from "@/test/sessionFixtures";

vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return { ...actual, signUp: vi.fn() };
});

// SignUpForm links to the login page with react-router's <Link>, which needs
// a router in the tree.
function renderForm() {
  const onSignedUp = vi.fn();
  const { container } = render(
    <MemoryRouter>
      <SignUpForm onSignedUp={onSignedUp} />
    </MemoryRouter>,
  );
  return { onSignedUp, container };
}

async function fillIn() {
  await userEvent.type(screen.getByLabelText("Your name"), "Ada Lovelace");
  await userEvent.type(screen.getByLabelText("Email"), "ada@example.com");
  await userEvent.type(screen.getByLabelText("Password"), "correct-horse");
  await userEvent.type(
    screen.getByLabelText("Confirm password"),
    "correct-horse",
  );
  await userEvent.click(
    screen.getByRole("checkbox", { name: /processing my personal data/i }),
  );
  await userEvent.click(screen.getByRole("button", { name: /confirm/i }));
}

describe("SignUpForm", () => {
  beforeEach(() => {
    vi.mocked(signUp).mockReset();
    vi.mocked(signUp).mockResolvedValue(
      sessionPayload({ currentUser: testUser }),
    );
  });

  it("signs up with the fields the legacy form collects", async () => {
    const { onSignedUp } = renderForm();

    await fillIn();

    await waitFor(() =>
      expect(signUp).toHaveBeenCalledWith({
        name: "Ada Lovelace",
        email: "ada@example.com",
        password: "correct-horse",
        passwordConfirmation: "correct-horse",
        consentNewsEmail: false,
        consentToDataProcessing: true,
        nickname: "",
      }),
    );
    expect(onSignedUp).toHaveBeenCalledWith(
      sessionPayload({ currentUser: testUser }),
    );
  });

  it("shows a validation failure against the field that caused it", async () => {
    vi.mocked(signUp).mockRejectedValue(
      new ApiError(422, {
        error: {
          code: "validation_failed",
          messages: ["Password confirmation doesn't match Password"],
          fields: { password_confirmation: ["doesn't match Password"] },
        },
      }),
    );
    renderForm();

    await fillIn();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Password confirmation doesn't match Password",
    );
    expect(screen.getByLabelText("Confirm password")).toHaveClass("is-invalid");
    expect(screen.getByText("doesn't match Password")).toBeInTheDocument();
  });

  // The API rejects a sign-up whose honeypot arrives non-blank, so the field
  // has to exist, stay empty, and stay out of everyone's way.
  it("carries a honeypot that no real user can see or reach", () => {
    const { container } = renderForm();
    const honeypot = container.querySelector<HTMLInputElement>(
      "input[name='nickname']",
    );

    expect(honeypot).not.toBeNull();
    expect(honeypot).toHaveValue("");
    expect(honeypot).toHaveAttribute("tabindex", "-1");
    expect(honeypot).toHaveAttribute("aria-hidden", "true");
  });

  it("links to the login page for someone who already has an account", () => {
    renderForm();

    expect(screen.getByRole("link", { name: /log in/i })).toHaveAttribute(
      "href",
      "/app/login",
    );
  });
});
