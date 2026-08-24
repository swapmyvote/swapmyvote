import { ApiError } from "@/lib/apiClient";

// Matches base_controller.rb's own copy for handle_unverified_request and
// other unhandled failures.
const genericFailureMessage = "Something went wrong - please try that again.";

/**
 * The messages to show for a failed request: the API's own when there are any,
 * the shared fallback otherwise. Shared by every form that posts to the API so
 * their catch blocks do not drift.
 */
export function apiErrorMessages(error: unknown): string[] {
  if (error instanceof ApiError && error.messages.length > 0) {
    return error.messages;
  }
  return [genericFailureMessage];
}

/**
 * The API's per-field messages, keyed by the Rails attribute name, for a form
 * that shows validation errors against the field that caused them. Empty for
 * anything that is not an API error.
 */
export function apiErrorFields(error: unknown): Record<string, string[]> {
  if (error instanceof ApiError) {
    return error.fields;
  }
  return {};
}
