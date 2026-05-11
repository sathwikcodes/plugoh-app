export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
    readonly details?: unknown,
    readonly userMessage: string = message,
  ) {
    super(message);
  }
}

export function userMessageForStatus(status: number) {
  if (status >= 500) return 'Server is temporarily unavailable. Please try again.';
  if (status === 401) return 'Your session expired. Please sign in again.';
  if (status === 403) return 'You do not have access to this action.';
  if (status === 404) return 'The requested resource was not found.';
  return 'Request failed. Please review your input and try again.';
}
