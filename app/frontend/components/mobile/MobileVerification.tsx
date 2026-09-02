import { type FormEvent, useState } from "react";
import Button from "react-bootstrap/Button";
import { FormErrors } from "@/components/forms/FormErrors";
import { PhoneNumberField } from "@/components/mobile/PhoneNumberField";
import { VerificationCodeField } from "@/components/mobile/VerificationCodeField";
import { apiErrorMessages } from "@/lib/apiErrors";
import { confirmVerification, sendVerification } from "@/lib/mobilePhone";
import { phoneNumberProblem } from "@/lib/phone";

interface MobileVerificationProps {
  /** Empty when there is none, and when the user has said they want to
   *  replace the one on file. */
  initialNumber: string;
  onVerified: () => void;
}

type Step = "number" | "code";

/**
 * The number check is the client's own (lib/phone.ts, the ported
 * intl-tel-input rules). Every other refusal comes from the API, which
 * re-checks everything regardless.
 */
export function MobileVerification({
  initialNumber,
  onVerified,
}: MobileVerificationProps) {
  const [step, setStep] = useState<Step>("number");
  const [number, setNumber] = useState(initialNumber);
  const [sentTo, setSentTo] = useState("");
  const [token, setToken] = useState("");
  const [showProblem, setShowProblem] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const problem = phoneNumberProblem(number);

  async function send(toNumber: string) {
    setBusy(true);
    setErrors([]);
    try {
      const sent = await sendVerification(toNumber);
      setSentTo(sent.number);
      setToken("");
      setStep("code");
    } catch (error) {
      setErrors(apiErrorMessages(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleNumberSubmit(event: FormEvent) {
    event.preventDefault();
    // Only complain once they have asked us to send: a message on the first
    // keystroke is noise.
    setShowProblem(true);
    // Before the early return below, or a client-side refusal renders beside
    // a leftover server error from a previous send.
    setErrors([]);
    if (problem !== null) {
      return;
    }
    await send(number);
  }

  async function handleCodeSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setErrors([]);
    try {
      await confirmVerification(token);
      // Deliberately still busy: the caller re-renders around this, and
      // leaving the button live would invite a second confirm on the way out.
      onVerified();
    } catch (error) {
      setErrors(apiErrorMessages(error));
      setBusy(false);
    }
  }

  function handleChangeNumber() {
    setErrors([]);
    setShowProblem(false);
    setStep("number");
  }

  if (step === "number") {
    return (
      <form onSubmit={handleNumberSubmit}>
        <div className="d-flex flex-column gap-3">
          <PhoneNumberField
            value={number}
            onChange={setNumber}
            problem={showProblem ? problem : null}
            disabled={busy}
          />

          <p className="subdued small mb-0">
            We need your mobile number to help prevent people creating fake
            accounts. We will only use it to send you a verification code.
          </p>

          <FormErrors messages={errors} />

          <div className="d-flex justify-content-end">
            <Button type="submit" variant="primary" disabled={busy}>
              Send me a code
            </Button>
          </div>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleCodeSubmit}>
      <div className="d-flex flex-column gap-3">
        <p className="mb-0">A verification code was sent to {sentTo}</p>

        <VerificationCodeField
          value={token}
          onChange={setToken}
          disabled={busy}
        />

        <FormErrors messages={errors} />

        <div className="d-flex justify-content-end">
          <Button type="submit" variant="primary" disabled={busy}>
            Verify
          </Button>
        </div>

        {/* <button>s, not links — they act rather than navigate. See
            `p .btn-link` in globals.scss for what makes them read as links. */}
        <p className="small subdued mb-0">
          If it does not arrive within 5 minutes, you can{" "}
          <Button
            type="button"
            variant="link"
            disabled={busy}
            // sentTo, not `number`: re-send to what the server confirmed it
            // sent to, not to whatever the field happens to hold.
            onClick={() => send(sentTo)}
          >
            send another code
          </Button>{" "}
          or{" "}
          <Button
            type="button"
            variant="link"
            disabled={busy}
            onClick={handleChangeNumber}
          >
            use a different number
          </Button>
        </p>
      </div>
    </form>
  );
}
