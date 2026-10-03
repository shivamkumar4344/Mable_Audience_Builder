import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildServer } from "./server";
import { openDatabase } from "./db";

const validRequest = {
  name: "Viewed products",
  asOf: "2026-09-29T00:00:00.000Z",
  conditions: [
    { eventType: "product_view", operator: "at_least", count: 1, withinDays: 7 }
  ]
};

let database: Database.Database;
let server: FastifyInstance;

beforeEach(() => {
  database = openDatabase(":memory:");
  database.prepare("INSERT INTO anonymous_users (id) VALUES (?)").run("anon_http");
  database.prepare(
    "INSERT INTO events (anonymous_id, event_type, occurred_at) VALUES (?, ?, ?)"
  ).run("anon_http", "product_view", "2026-09-28T12:00:00.000Z");
  server = buildServer(database);
});

afterEach(async () => {
  await server.close();
});

describe("HTTP API", () => {
  it("returns 200 for a valid preview request", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/v1/audiences/preview",
      payload: validRequest
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      name: validRequest.name,
      asOf: validRequest.asOf,
      total: 1,
      members: [{
        anonymousId: "anon_http",
        evidence: [{ eventType: "product_view", observedCount: 1 }]
      }]
    });
  });

  it("returns the health response", async () => {
    const response = await server.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
  });

  it.each([
    ["bad eventType", { conditions: [{ ...validRequest.conditions[0], eventType: "unknown" }] }],
    ["bad operator", { conditions: [{ ...validRequest.conditions[0], operator: "at_most" }] }],
    ["negative count", { conditions: [{ ...validRequest.conditions[0], count: -1 }] }],
    ["at_least with zero", { conditions: [{ ...validRequest.conditions[0], count: 0 }] }],
    ["withinDays zero", { conditions: [{ ...validRequest.conditions[0], withinDays: 0 }] }],
    ["bad asOf", { asOf: "not-a-date" }],
    ["empty conditions", { conditions: [] }],
    ["empty name", { name: "" }],
    ["name over 100 characters", { name: "a".repeat(101) }]
  ])("returns a validation envelope for %s", async (_label, changes) => {
    const response = await server.inject({
      method: "POST",
      url: "/v1/audiences/preview",
      payload: { ...validRequest, ...changes }
    });
    const body = response.json();

    expect(response.statusCode).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message).toBe("Request validation failed");
    expect(body.error.details.length).toBeGreaterThan(0);
  });

  it("rejects malformed JSON with a validation envelope", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/v1/audiences/preview",
      headers: { "content-type": "application/json" },
      payload: "{bad"
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Malformed JSON request body",
        details: []
      }
    });
  });

  it("returns a not found envelope for an unknown route", async () => {
    const response = await server.inject({ method: "GET", url: "/unknown" });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: { code: "NOT_FOUND", message: "Route not found" }
    });
  });
});
