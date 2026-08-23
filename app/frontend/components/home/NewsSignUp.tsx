import { ActionNetworkForm } from "@/components/home/ActionNetworkForm";

// Ports app/views/home/_news_sign_up_before_polls_close.html.haml.
export function NewsSignUp() {
  return (
    <div className="background-pattern border-bottom">
      <div className="container text-center">
        <h1>Not voting this time?</h1>
        <h2 className="subdued">
          Sign up for future news from the Swap My Vote team and Forward
          Democracy
        </h2>
        <ActionNetworkForm />
      </div>
    </div>
  );
}
