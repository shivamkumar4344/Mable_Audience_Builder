import { z } from "zod";

export const eventTypes = [
  "page_view",
  "product_view",
  "add_to_cart",
  "checkout_started",
  "purchase"
] as const;

export const eventTypeSchema = z.enum(eventTypes);

const conditionSchema = z.object({
  eventType: eventTypeSchema,
  operator: z.enum(["at_least", "exactly"]),
  count: z.number().int().min(0),
  withinDays: z.number().int().min(1).max(90)
});

export const previewRequestSchema = z.object({
  name: z.string().min(1).max(100),
  asOf: z.string().datetime({ offset: true }),
  conditions: z.array(conditionSchema).min(1).max(10)
}).superRefine((request, context) => {
  request.conditions.forEach((condition, index) => {
    if (condition.operator === "at_least" && condition.count < 1) {
      context.addIssue({
        code: "custom",
        path: ["conditions", index, "count"],
        message: "at_least requires count to be at least 1"
      });
    }
  });
});

export type PreviewRequest = z.infer<typeof previewRequestSchema>;
export type AudienceCondition = PreviewRequest["conditions"][number];

export interface AudienceEvidence {
  eventType: AudienceCondition["eventType"];
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
