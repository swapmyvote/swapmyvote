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
        swapReference: "",
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

  // Every other field renders its API message beside itself as well as in the
  // summary. The consent box set `isInvalid` — so it turned red — but rendered
  // no message, leaving the only explanation in the summary at the far end of
  // a long form.
  it("shows the consent error beside the checkbox, not only in the summary", async () => {
    vi.mocked(signUp).mockRejectedValue(
      new ApiError(422, {
        error: {
          code: "validation_failed",
          messages: ["Consent to data processing must be accepted"],
          fields: { consent_to_data_processing: ["must be accepted"] },
        },
      }),
    );
    renderForm();

    await fillIn();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Consent to data processing must be accepted",
    );
    expect(
      screen.getByLabelText(/i consent to swapmyvote processing/i),
    ).toHaveClass("is-invalid");
    expect(screen.getByText("must be accepted")).toBeInTheDocument();
  });

  // The API rejects a sign-up whose honeypot arrives non-blank, so the field
  // has to exist, stay empty, and stay out of everyone's way.
  it("carries a honeypot that no real user can see or reach", () => {
    const { container } = renderForm();
    // Deliberately not a name any autocomplete heuristic recognises: a
    // password manager filling it in would hand a real user a 422 they can
    // neither see nor clear.
    const honeypot = container.querySelector<HTMLInputElement>(
      "input[name='swap_reference']",
    );

    expect(honeypot).not.toBeNull();
    expect(honeypot).toHaveValue("");
    expect(honeypot).toHaveAttribute("tabindex", "-1");
    expect(honeypot).toHaveAttribute("aria-hidden", "true");
    expect(honeypot).toHaveAttribute("autocomplete", "off");
  });

  it("shows a top-level failure that belongs to no single field", async () => {
    vi.mocked(signUp).mockRejectedValue(
      new ApiError(422, {
        error: {
          code: "spam_detected",
          messages: ["Something went wrong - please try that again"],
          fields: {},
        },
      }),
    );
    const { onSignedUp } = renderForm();

    await fillIn();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong - please try that again",
    );
    expect(onSignedUp).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /confirm/i })).toBeEnabled();
  });

  it("links to the login page for someone who already has an account", () => {
    renderForm();

    expect(screen.getByRole("link", { name: /log in/i })).toHaveAttribute(
      "href",
      "/app/login",
    );
  });
});
