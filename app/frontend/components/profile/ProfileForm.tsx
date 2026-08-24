import { type FormEvent, useId, useState } from "react";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import { ConstituencyAutocomplete } from "@/components/home/ConstituencyAutocomplete";
import { PostcodeLookup } from "@/components/home/PostcodeLookup";
import { apiErrorMessages, updateProfile } from "@/lib/profile";
import type {
  Constituency,
  CurrentUser,
  Party,
  ProfileUpdateResult,
} from "@/types/api";

interface ProfileFormProps {
  parties: Party[];
  constituencies: Constituency[];
  user: CurrentUser;
  /** Election day, swap confirmed: the swap fields are frozen. */
  locked: boolean;
  /** Whether the user currently has an agreed swap — mirrors User#swapped?.
   *  Only then does changing party preferences or constituency undo anything,
   *  so only then is it worth warning about. */
  hasSwap: boolean;
  onSaved: (result: ProfileUpdateResult) => void;
}

// Both still HAML. The mobile form is M6; account deletion is not in the
// migration plan's screen list at all.
const hamlMobile = "/user/edit";
const hamlDeleteAccount = "/confirm_account_deletion";

/**
 * Ports app/views/users/edit.html.haml: the two party choices, the
 * constituency, the email, and the warnings that come with changing any of
 * them.
 *
 * The mobile number is deliberately not editable here. It is M6's, and
 * standing up a second copy of the intl-tel-input widget only to throw it away
 * would be waste — so this reports the number's state and links to the legacy
 * page that changes it.
 */
export function ProfileForm({
  parties,
  constituencies,
  user,
  locked,
  hasSwap,
  onSaved,
}: ProfileFormProps) {
  const preferredId = useId();
  const willingId = useId();
  const emailId = useId();

  const [preferredPartyId, setPreferredPartyId] = useState(
    user.preferredParty ? String(user.preferredParty.id) : "",
  );
  const [willingPartyId, setWillingPartyId] = useState(
    user.willingParty ? String(user.willingParty.id) : "",
  );
  const [onsId, setOnsId] = useState(user.constituencyOnsId ?? "");
  const [postcode, setPostcode] = useState("");
  const [email, setEmail] = useState(user.email ?? "");
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  function handleConstituencyPicked(picked: string) {
    setOnsId(picked);
    if (picked !== "") {
      setPostcode("");
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setErrors([]);
    try {
      const result = await updateProfile({
        preferredPartyId,
        willingPartyId,
        constituencyOnsId: onsId,
        email,
      });
      onSaved(result);
    } catch (error) {
      setErrors(apiErrorMessages(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="d-flex flex-column gap-3">
        <Form.Group controlId={preferredId}>
          <Form.Label>My preferred party is</Form.Label>
          <Form.Select
            value={preferredPartyId}
            disabled={locked}
            onChange={(event) => setPreferredPartyId(event.target.value)}
          >
            <option value="">...</option>
            {parties.map((party) => (
              <option key={party.id} value={String(party.id)}>
                {party.name}
              </option>
            ))}
          </Form.Select>
        </Form.Group>

        <Form.Group controlId={willingId}>
          <Form.Label>but I'm willing to vote for</Form.Label>
          <Form.Select
            value={willingPartyId}
            disabled={locked}
            onChange={(event) => setWillingPartyId(event.target.value)}
          >
            <option value="">...</option>
            {parties.map((party) => (
              <option key={party.id} value={String(party.id)}>
                {party.name}
              </option>
            ))}
          </Form.Select>
        </Form.Group>

        <ConstituencyAutocomplete
          constituencies={constituencies}
          value={onsId}
          onChange={handleConstituencyPicked}
          disabled={locked}
        />

        {!locked && (
          <PostcodeLookup
            constituencies={constituencies}
            postcode={postcode}
            onPostcodeChange={setPostcode}
            onConstituencyFound={setOnsId}
          />
        )}

        <Form.Group controlId={emailId}>
          <Form.Label>My email address is</Form.Label>
          <Form.Control
            type="email"
            placeholder="me@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Form.Group>

        <div>
          <p className="mb-1">
            My mobile number is{" "}
            {user.mobileVerified ? "verified" : "not verified"}
          </p>
          <a href={hamlMobile}>
            {user.mobileVerified
              ? "Change your mobile number"
              : "Verify your mobile number"}
          </a>
        </div>

        {hasSwap && (
          <Alert variant={locked ? "info" : "danger"} className="small mb-0">
            {locked
              ? "It's election day and you've already confirmed your swap, so your party preferences and constituency are currently locked"
              : "Changing your party preferences or constituency will undo any swap that you have agreed to"}
          </Alert>
        )}

        {errors.length > 0 && (
          <Alert variant="danger" className="small mb-0" role="alert">
            {errors.map((message, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: a static list rendered once per save; message text is not unique, so the index is the only stable key.
              <p key={index} className="mb-0">
                {message}
              </p>
            ))}
          </Alert>
        )}

        <div className="d-flex justify-content-end">
          <Button type="submit" variant="primary" disabled={saving}>
            Save
          </Button>
        </div>

        <hr className="my-0" />

        <p className="small subdued mb-0">
          If you no longer want to take part in Swap My Vote, you can{" "}
          <a href={hamlDeleteAccount}>delete your account</a>.
        </p>
      </div>
    </form>
  );
}
