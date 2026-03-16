/**
 * Maps raw error messages to user-friendly display strings.
 *
 * NEVER show raw error.message, stack traces, or GraphQL internal errors
 * directly to users. Always pipe through getUserFriendlyMessage() first.
 */

/** Common error patterns and their user-friendly replacements */
const ERROR_MAP: Array<[test: RegExp, friendly: string]> = [
  [/network\s*error|ECONNREFUSED|fetch\s*failed/i, 'Unable to reach the server. Please check your connection and try again.'],
  [/unauthorized|401|jwt\s*expired/i, 'Your session has expired. Please sign in again.'],
  [/forbidden|403|access\s*denied/i, 'You do not have permission to perform this action.'],
  [/not\s*found|404/i, 'The requested resource could not be found.'],
  [/timeout|ETIMEDOUT|504/i, 'The request timed out. Please try again.'],
  [/rate\s*limit|429|too\s*many/i, 'Too many requests. Please wait a moment and try again.'],
  [/internal\s*server|500/i, 'A server error occurred. Please try again later.'],
  [/validation|invalid\s*input/i, 'Please check your input and try again.'],
  [/CombinedError/i, 'A data loading error occurred. Please refresh the page.'],
  [/GraphQL/i, 'A data loading error occurred. Please try again.'],
];

/**
 * Converts a raw error into a user-friendly message string.
 * Logs the original error for debugging while returning a safe message for the UI.
 *
 * @param error - The raw error (Error object, string, or unknown)
 * @param fallback - Default message if no pattern matches
 * @returns A user-friendly error string safe to display in the UI
 */
export function getUserFriendlyMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  const raw = error instanceof Error
    ? error.message
    : typeof error === 'string'
      ? error
      : String(error);

  for (const [pattern, friendly] of ERROR_MAP) {
    if (pattern.test(raw)) return friendly;
  }

  return fallback;
}

/**
 * Extracts a user-friendly message from a urql CombinedError.
 * Prefers graphQLErrors[0].message if it looks user-friendly,
 * otherwise falls back to the generic mapping.
 */
export function getGraphQLErrorMessage(
  error: { message: string; graphQLErrors?: Array<{ message: string }> },
  fallback = 'Failed to load data. Please try again.',
): string {
  // If there's a GraphQL-level error that looks user-friendly (not a stack trace), use it
  const gqlMsg = error.graphQLErrors?.[0]?.message;
  if (gqlMsg && gqlMsg.length < 120 && !/at\s+\w+\s*\(/.test(gqlMsg)) {
    return gqlMsg;
  }

  return getUserFriendlyMessage(error.message, fallback);
}
