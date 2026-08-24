import Alert from "react-bootstrap/Alert";

interface FormErrorsProps {
  /** The API's top-level messages, from `apiErrorMessages`. */
  messages: string[];
}

/**
 * The error summary a form shows after a failed submit, shared by every form
 * that posts to the API so their alerts do not drift. Per-field messages are
 * rendered against their own fields; these are the ones that belong to the
 * form as a whole.
 *
 * Renders nothing when there is nothing to say.
 */
export function FormErrors({ messages }: FormErrorsProps) {
  if (messages.length === 0) {
    return null;
  }

  return (
    <Alert variant="danger" className="small mb-0" role="alert">
      {messages.map((message, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: a static list rendered once per submit; message text is not unique, so the index is the only stable key.
        <p key={index} className="mb-0">
          {message}
        </p>
      ))}
    </Alert>
  );
}
