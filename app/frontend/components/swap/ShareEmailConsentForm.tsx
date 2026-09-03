import { type FormEvent, useState } from "react";
import Form from "react-bootstrap/Form";
import { FormErrors } from "@/components/forms/FormErrors";
import { apiErrorMessages } from "@/lib/apiErrors";
import { shareEmail, useSwapMutation } from "@/lib/swap";

interface ShareEmailConsentFormProps {
  /** The checkbox's label. Wording differs by dashboard state. */
  label: string;
  submitLabel: string;
}

/**
 * The one form behind three near-identical HAML ones —
 * users/show/_confirm_outgoing_swap, _confirm_incoming_swap and
 * _swap_confirmed each post a differently named consent field to the same
 * action, and User#update_swap accepts any of the three.
 */
export function ShareEmailConsentForm({
  label,
  submitLabel,
}: ShareEmailConsentFormProps) {
  const mutation = useSwapMutation(shareEmail);
  const [consented, setConsented] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!consented) {
      return;
    }

    setErrors([]);
    try {
      await mutation.mutateAsync(undefined);
    } catch (error) {
      setErrors(apiErrorMessages(error));
    }
  }

  return (
    <Form onSubmit={handleSubmit} className="d-flex flex-column gap-2">
      <FormErrors messages={errors} />

      <Form.Check
        type="checkbox"
        id="share-email-consent"
        checked={consented}
        onChange={(event) => setConsented(event.target.checked)}
        label={label}
      />

      <div>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={mutation.isPending}
        >
          {submitLabel}
        </button>
      </div>
    </Form>
  );
}
