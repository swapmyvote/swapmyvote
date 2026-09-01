import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MobileVerification } from "@/components/mobile/MobileVerification";
import { ApiError } from "@/lib/apiClient";
import { confirmVerification, sendVerification } from "@/lib/mobilePhone";
import { sessionPayload, testUser } from "@/test/sessionFixtures";

vi.mock("@/lib/mobilePhone", () => ({
  sendVerification: vi.fn(),
  confirmVerification: vi.fn(),
}));

const number = "+447911123456";

function renderForm(initialNumber = "") {
  const onVerified = vi.fn();
  render(
    <MobileVerification
      initialNumber={initialNumber}
      onVerified={onVerified}
    />,
  );
  return { onVerified };
}

async function submitNumber() {
  await userEvent.click(screen.getByRole("button", { name: "Send me a code" }));
}

async function submitCode(code = "123456") {
  await userEvent.type(screen.getByLabelText("The 6 digit code"), code);
  await userEvent.click(screen.getByRole("button", { name: "Verify" }));
}

describe("MobileVerification", () => {
  beforeEach(() => {
    vi.mocked(sendVerification).mockReset();
    vi.mocked(sendVerification).mockResolvedValue({ number, sent: true });
    vi.mocked(confirmVerification).mockReset();
    vi.mocked(confirmVerification).mockResolvedValue(
      sessionPayload({ currentUser: testUser }),
    );
  });

  // Assert the digits, not the exact text: react-phone-number-input formats
  // as you type, and the national grouping comes from libphonenumber metadata.
  it("starts from the number already on the account", () => {
    renderForm(number);

    const input = screen.getByLabelText(
      "My mobile number is",
    ) as HTMLInputElement;
    expect(input.value.replace(/\D/g, "")).toContain("7911123456");
  });

  it("sends a code and moves to the code step", async () => {
    renderForm(number);

    await submitNumber();

    await waitFor(() => expect(sendVerification).toHaveBeenCalledWith(number));
    expect(screen.getByLabelText("The 6 digit code")).toBeInTheDocument();
    expect(screen.getByText(/sent to/)).toHaveTextContent(number);
  });

  // The legacy widget blocked submission with a custom validity message; the
  // React form refuses to post instead, and says the same thing.
  it("refuses to send a number that is not a mobile", async () => {
    renderForm("+442079460000");

    await submitNumber();

    expect(sendVerification).not.toHaveBeenCalled();
    expect(
      screen.getByText("This doesn't look like a mobile phone number"),
    ).toBeInTheDocument();
  });

  it("stays quiet about the number until it is submitted", () => {
    renderForm("+442079460000");

    expect(
      screen.queryByText("This doesn't look like a mobile phone number"),
    ).not.toBeInTheDocument();
  });

  it("shows the API's message when the SMS cannot be sent", async () => {
    vi.mocked(sendVerification).mockRejectedValue(
      new ApiError(502, {
        error: {
          code: "sms_send_failed",
          messages: [
            "Sorry, I couldn't send you a verification SMS! Please try again later.",
          ],
          fields: {},
        },
      }),
    );
    renderForm(number);

    await submitNumber();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /couldn't send you a verification SMS/,
    );
    expect(screen.queryByLabelText("The 6 digit code")).not.toBeInTheDocument();
  });

  it("confirms the code and tells the caller", async () => {
    const { onVerified } = renderForm(number);

    await submitNumber();
    await submitCode();

    await waitFor(() =>
      expect(confirmVerification).toHaveBeenCalledWith("123456"),
    );
    expect(onVerified).toHaveBeenCalled();
  });

  it("keeps the code step open and shows why a wrong code failed", async () => {
    vi.mocked(confirmVerification).mockRejectedValue(
      new ApiError(422, {
        error: {
          code: "code_incorrect",
          messages: [
            "The code you entered was incorrect. Please use the code sent most recently.",
          ],
          fields: {},
        },
      }),
    );
    const { onVerified } = renderForm(number);

    await submitNumber();
    await submitCode("000000");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /code you entered was incorrect/,
    );
    expect(screen.getByLabelText("The 6 digit code")).toBeInTheDocument();
    expect(onVerified).not.toHaveBeenCalled();
  });

  it("re-sends to the same number", async () => {
    renderForm(number);

    await submitNumber();
    await userEvent.click(
      screen.getByRole("button", { name: "Send another code" }),
    );

    await waitFor(() => expect(sendVerification).toHaveBeenCalledTimes(2));
    expect(vi.mocked(sendVerification).mock.calls[1][0]).toBe(number);
  });

  it("goes back to the number step to change the number", async () => {
    renderForm(number);

    await submitNumber();
    await userEvent.click(
      screen.getByRole("button", { name: "Use a different number" }),
    );

    expect(screen.getByLabelText("My mobile number is")).toBeInTheDocument();
    expect(screen.queryByLabelText("The 6 digit code")).not.toBeInTheDocument();
  });
});
