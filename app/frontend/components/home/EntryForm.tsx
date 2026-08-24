import { useState } from "react";
import Alert from "react-bootstrap/Alert";
import { useNavigate } from "react-router-dom";
import { ConstituencyStep } from "@/components/home/ConstituencyStep";
import { PartiesStep } from "@/components/home/PartiesStep";
import { Section } from "@/components/home/Section";
import { apiClient } from "@/lib/apiClient";
import { spaPaths } from "@/lib/spaPaths";
import type { Constituency, Party, PrePopulate } from "@/types/api";

interface EntryFormProps {
  constituencies: Constituency[];
  parties: Party[];
  /** "another constituency" / "the other constituency", from the election. */
  constituencyOther: string;
}

/**
 * The two-step form on the home page: constituency, then parties, then off to
 * sign up. Ports app/views/home/_swap_form.html.haml and the `pre_login_flow`
 * the HomeController drove it with.
 *
 * The step the user is on is held here rather than in the Rails session. The
 * legacy flow round-tripped to the server between steps because it had to —
 * each step was a form POST. The answers are still stashed server-side after
 * each step (POST /api/v1/pre_populate), because that is where they are read
 * from: the sign-up endpoint applies them to the new account itself, and the
 * client never sends them.
 */
export function EntryForm({
  constituencies,
  parties,
  constituencyOther,
}: EntryFormProps) {
  const [onsId, setOnsId] = useState("");
  const [step, setStep] = useState<"constituency" | "parties">("constituency");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function stash(answers: {
    constituencyOnsId: string;
    preferredPartyId?: string;
    willingPartyId?: string;
  }) {
    return apiClient.post<PrePopulate>("/pre_populate", {
      constituency_ons_id: answers.constituencyOnsId,
      preferred_party_id: answers.preferredPartyId,
      willing_party_id: answers.willingPartyId,
    });
  }

  async function handleConstituencyChosen(chosen: string) {
    setOnsId(chosen);
    setError(null);
    try {
      await stash({ constituencyOnsId: chosen });
    } catch {
      // Losing the stash is not worth blocking on: the answer is still held
      // here, and the next step stashes everything again.
    }
    setStep("parties");
  }

  async function handlePartiesChosen(chosen: {
    preferredPartyId: string;
    willingPartyId: string;
  }) {
    setSubmitting(true);
    setError(null);
    try {
      await stash({ constituencyOnsId: onsId, ...chosen });
    } catch {
      // Here it does matter — sign-up reads the stash, and without it the new
      // account arrives with none of these answers.
      setSubmitting(false);
      setError(
        "Sorry, something went wrong saving your choices. Please try again.",
      );
      return;
    }
    navigate(spaPaths.signup);
  }

  return (
    <Section tone="white" narrow>
      {error && (
        <Alert variant="danger" className="small" role="alert">
          {error}
        </Alert>
      )}

      {step === "constituency" ? (
        <ConstituencyStep
          constituencies={constituencies}
          initialOnsId={onsId}
          onComplete={handleConstituencyChosen}
        />
      ) : (
        <PartiesStep
          parties={parties}
          constituencyOther={constituencyOther}
          submitting={submitting}
          onComplete={handlePartiesChosen}
        />
      )}
    </Section>
  );
}
