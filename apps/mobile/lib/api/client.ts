import type { ApiResponse } from "@plugoh/contracts";
import { useAuthStore } from "@/store/auth";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

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

function userMessageForStatus(status: number) {
  if (status >= 500) return "Server is temporarily unavailable. Please try again.";
  if (status === 401) return "Your session expired. Please sign in again.";
  if (status === 403) return "You do not have access to this action.";
  if (status === 404) return "The requested resource was not found.";
  return "Request failed. Please review your input and try again.";
}

export async function api<T>(
  path: string,
  init: RequestInit & { body?: BodyInit | null; skipAuth?: boolean } = {},
): Promise<T> {
  const token = useAuthStore.getState().session?.access_token;
  const headers = new Headers(init.headers);
  if (!init.skipAuth && token) headers.set("authorization", `Bearer ${token}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        headers,
        signal: controller.signal,
      });
    } catch (error) {
      if (controller.signal.aborted) {
        throw new ApiError(`Request timed out for ${path}`, "TIMEOUT", 408, undefined, "Request timed out. Please try again.");
      }
      throw new ApiError(
        `Could not reach API at ${API_BASE_URL}.`,
        "NETWORK_ERROR",
        0,
        error instanceof Error ? error.message : error,
        "Network unavailable. Check your connection and try again.",
      );
    }

    const rawBody = await response.text();
    let parsed: ApiResponse<T> | null = null;

    if (rawBody.trim().length > 0) {
      try {
        parsed = JSON.parse(rawBody) as ApiResponse<T>;
      } catch {
        if (!response.ok) {
          throw new ApiError(
            `Non-JSON error response for ${path}`,
            "NON_JSON_ERROR_RESPONSE",
            response.status,
            rawBody,
            userMessageForStatus(response.status),
          );
        }
        throw new ApiError(
          `Invalid JSON response from ${path}`,
          "INVALID_RESPONSE",
          response.status,
          rawBody,
          "Unexpected server response. Please try again.",
        );
      }
    }

    if (!response.ok) {
      if (parsed && !parsed.success) {
        throw new ApiError(
          parsed.error.message,
          parsed.error.code,
          response.status,
          parsed.error.details,
          userMessageForStatus(response.status),
        );
      }
      throw new ApiError(
        `Request failed for ${path}`,
        "SERVER_ERROR",
        response.status,
        rawBody,
        userMessageForStatus(response.status),
      );
    }

    if (!parsed) {
      throw new ApiError(
        `Empty response body from ${path}`,
        "INVALID_RESPONSE",
        response.status,
        rawBody,
        "Unexpected empty response from server.",
      );
    }

    if (!parsed.success) {
      throw new ApiError(
        parsed.error.message,
        parsed.error.code,
        response.status,
        parsed.error.details,
        parsed.error.message || userMessageForStatus(response.status),
      );
    }

    return parsed.data;
  } finally {
    clearTimeout(timeout);
  }
}

export function jsonRequest(body?: unknown) {
  return {
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  };
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}
