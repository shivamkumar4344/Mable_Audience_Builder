import type { PreviewRequest, PreviewResponse } from "./types";
import { ApiError } from "./types";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001").replace(/\/$/, "");

function isErrorEnvelope(value: unknown): value is {
  error: {
    code: string;
    message: string;
    details?: Array<{ path: string; message: string }>;
  };
} {
  if (typeof value !== "object" || value === null || !("error" in value)) {
    return false;
  }

  const error = value.error;
  return typeof error === "object" && error !== null
    && "code" in error && typeof error.code === "string"
    && "message" in error && typeof error.message === "string";
}

export async function previewAudience(request: PreviewRequest): Promise<PreviewResponse> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}/v1/audiences/preview`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request)
    });
  } catch {
    throw new ApiError("NETWORK_ERROR", "Unable to reach the audience service.");
  }

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = undefined;
    }

    if (isErrorEnvelope(body)) {
      const code = body.error.code === "VALIDATION_ERROR"
        || body.error.code === "NOT_FOUND"
        || body.error.code === "INTERNAL_ERROR"
        ? body.error.code
        : "INTERNAL_ERROR";
      throw new ApiError(code, body.error.message, body.error.details ?? []);
    }

    throw new ApiError("INTERNAL_ERROR", "The audience service returned an unexpected error.");
  }

  return await response.json() as PreviewResponse;
}
