import { useRef, useState } from "react";
import { previewAudience } from "../api/client";
import { ApiError, type PreviewRequest, type PreviewResponse } from "../api/types";

export type PreviewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: PreviewResponse }
  | { status: "error"; error: ApiError };

export function useAudiencePreview() {
  const [state, setState] = useState<PreviewState>({ status: "idle" });
  const lastRequest = useRef<PreviewRequest | null>(null);

  async function submit(request: PreviewRequest): Promise<void> {
    lastRequest.current = request;
    setState({ status: "loading" });

    try {
      const data = await previewAudience(request);
      setState({ status: "success", data });
    } catch (error: unknown) {
      const apiError = error instanceof ApiError
        ? error
        : new ApiError("INTERNAL_ERROR", "Something went wrong while loading the audience.");
      setState({ status: "error", error: apiError });
    }
  }

  async function retry(): Promise<void> {
    if (lastRequest.current !== null) {
      await submit(lastRequest.current);
    }
  }

  return { state, submit, retry };
}
