import { ActionNetworkForm } from "@/components/home/ActionNetworkForm";
import { Section } from "@/components/home/Section";

// Ports app/views/home/_news_sign_up_before_polls_close.html.haml.
export function NewsSignUp() {
  return (
    <Section centered narrow>
      <h2>Not voting this time?</h2>
      {/* Was an h2, which put a second line of uppercase directly under the
          first. It reads as the sentence it is. */}
      <p className="lead text-body-secondary">
        Sign up for future news from the Swap My Vote team and Forward Democracy
      </p>
      <ActionNetworkForm />
    </Section>
  );
}
