import { type FormEvent, useState } from "react";
import Button from "react-bootstrap/Button";
import { FormErrors } from "@/components/forms/FormErrors";
import { PhoneNumberField } from "@/components/mobile/PhoneNumberField";
import { VerificationCodeField } from "@/components/mobile/VerificationCodeField";
import { apiErrorMessages } from "@/lib/apiErrors";
import { confirmVerification, sendVerification } from "@/lib/mobilePhone";
import { phoneNumberProblem } from "@/lib/phone";

interface MobileVerificationProps {
  /** The number already on the account, so the form starts from it rather
   *  than making the user retype it. Empty when there is none. */
  initialNumber: string;
  onVerified: () => void;
}

type Step = "number" | "code";

/**
 * Ports the whole legacy verification journey — the number field on
 * app/views/users/edit.html.haml plus mobile_phone/verify_create and
 * verify_token — into one two-step form.
 *
 * The number check is the client's own (lib/phone.ts, the ported
 * intl-tel-input rules); every other refusal comes from the API, which
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
    // Only complain once they have asked us to send: an error message that
    // appears on the first keystroke is noise.
    setShowProblem(true);
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

        <hr className="my-0" />

        <p className="small subdued mb-0">
          If it does not arrive within 5 minutes, you can send another code or
          go back and check the number.
        </p>

        <div className="d-flex gap-2">
          <Button
            type="button"
            variant="outline-secondary"
            disabled={busy}
            onClick={() => send(sentTo)}
          >
            Send another code
          </Button>
          <Button
            type="button"
            variant="outline-secondary"
            disabled={busy}
            onClick={handleChangeNumber}
          >
            Use a different number
          </Button>
        </div>
      </div>
    </form>
  );
}
