export const eventTypes = [
  "page_view",
  "product_view",
  "add_to_cart",
  "checkout_started",
  "purchase"
] as const;

export type EventType = (typeof eventTypes)[number];
export type Operator = "at_least" | "exactly";

export interface AudienceCondition {
  eventType: EventType;
  operator: Operator;
  count: number;
  withinDays: number;
}

export interface PreviewRequest {
  name: string;
  asOf: string;
  conditions: AudienceCondition[];
}

export interface AudienceEvidence {
  eventType: EventType;
  observedCount: number;
}

export interface AudienceMember {
  anonymousId: string;
  evidence: AudienceEvidence[];
}

export interface PreviewResponse {
  name: string;
  asOf: string;
  total: number;
  members: AudienceMember[];
}

export interface ApiErrorDetail {
  path: string;
  message: string;
}

export type ApiErrorCode = "VALIDATION_ERROR" | "NOT_FOUND" | "INTERNAL_ERROR" | "NETWORK_ERROR";

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly details: ApiErrorDetail[];

  constructor(code: ApiErrorCode, message: string, details: ApiErrorDetail[] = []) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
  }
}
