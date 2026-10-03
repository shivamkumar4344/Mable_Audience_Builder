import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import type { PreviewRequest } from "./audience";
import { evaluateAudience } from "./evaluator";
import { openDatabase } from "./db";

const asOf = "2026-09-29T00:00:00.000Z";
const databases: Database.Database[] = [];

type FixtureEvent = [eventType: string, occurredAt: string];

function createDatabase(users: Record<string, FixtureEvent[]>): Database.Database {
  const database = openDatabase(":memory:");
  databases.push(database);
  const insertUser = database.prepare("INSERT INTO anonymous_users (id) VALUES (?)");
  const insertEvent = database.prepare(
    "INSERT INTO events (anonymous_id, event_type, occurred_at) VALUES (?, ?, ?)"
  );

  for (const [anonymousId, events] of Object.entries(users)) {
    insertUser.run(anonymousId);
    for (const [eventType, occurredAt] of events) {
      insertEvent.run(anonymousId, eventType, occurredAt);
    }
  }

  return database;
}

function requestWithConditions(conditions: PreviewRequest["conditions"]): PreviewRequest {
  return { name: "Test audience", asOf, conditions };
}

afterEach(() => {
  while (databases.length > 0) {
    databases.pop()?.close();
  }
});

describe("evaluateAudience", () => {
  it("matches at_least conditions and excludes users below the threshold", () => {
    const database = createDatabase({
      anon_match: [
        ["product_view", "2026-09-28T12:00:00.000Z"],
        ["product_view", "2026-09-27T12:00:00.000Z"]
      ],
      anon_below: [["product_view", "2026-09-28T12:00:00.000Z"]]
    });

    const result = evaluateAudience(requestWithConditions([
      { eventType: "product_view", operator: "at_least", count: 2, withinDays: 7 }
    ]), database);

    expect(result.members.map((member) => member.anonymousId)).toEqual(["anon_match"]);
  });

  it("matches exactly conditions and includes exactly zero users", () => {
    const database = createDatabase({
      anon_zero: [],
      anon_one: [["purchase", "2026-09-28T12:00:00.000Z"]],
      anon_two: [
        ["purchase", "2026-09-28T12:00:00.000Z"],
        ["purchase", "2026-09-27T12:00:00.000Z"]
      ]
    });

    const result = evaluateAudience(requestWithConditions([
      { eventType: "purchase", operator: "exactly", count: 0, withinDays: 7 }
    ]), database);

    expect(result.members.map((member) => member.anonymousId)).toEqual(["anon_zero"]);
  });

  it("combines conditions with AND", () => {
    const database = createDatabase({
      anon_match: [
        ["product_view", "2026-09-28T12:00:00.000Z"],
        ["product_view", "2026-09-27T12:00:00.000Z"]
      ],
      anon_purchase: [
        ["product_view", "2026-09-28T12:00:00.000Z"],
        ["product_view", "2026-09-27T12:00:00.000Z"],
        ["purchase", "2026-09-28T13:00:00.000Z"]
      ]
    });

    const result = evaluateAudience(requestWithConditions([
      { eventType: "product_view", operator: "at_least", count: 2, withinDays: 7 },
      { eventType: "purchase", operator: "exactly", count: 0, withinDays: 7 }
    ]), database);

    expect(result.total).toBe(1);
    expect(result.members[0]?.anonymousId).toBe("anon_match");
  });

  it("excludes the lower window boundary and includes the upper boundary", () => {
    const database = createDatabase({
      anon_boundary: [
        ["product_view", "2026-09-22T00:00:00.000Z"],
        ["product_view", "2026-09-22T00:00:01.000Z"],
        ["product_view", asOf]
      ]
    });

    const result = evaluateAudience(requestWithConditions([
      { eventType: "product_view", operator: "exactly", count: 2, withinDays: 7 }
    ]), database);

    expect(result.total).toBe(1);
    expect(result.members[0]?.evidence[0]?.observedCount).toBe(2);
  });

  it("ignores events after asOf", () => {
    const database = createDatabase({
      anon_future: [["product_view", "2026-09-29T00:00:01.000Z"]]
    });

    const result = evaluateAudience(requestWithConditions([
      { eventType: "product_view", operator: "exactly", count: 0, withinDays: 7 }
    ]), database);

    expect(result.members.map((member) => member.anonymousId)).toEqual(["anon_future"]);
    expect(result.members[0]?.evidence[0]?.observedCount).toBe(0);
  });

  it("produces different results for the same rule with a different asOf", () => {
    const database = createDatabase({
      anon_reproducible: [["product_view", "2026-09-28T12:00:00.000Z"]]
    });
    const rule: Omit<PreviewRequest, "asOf"> = {
      name: "Reproducibility",
      conditions: [{ eventType: "product_view", operator: "exactly", count: 1, withinDays: 1 }]
    };

    const first = evaluateAudience({ ...rule, asOf }, database);
    const second = evaluateAudience({ ...rule, asOf: "2026-09-28T00:00:00.000Z" }, database);

    expect(first.total).toBe(1);
    expect(second.total).toBe(0);
  });

  it("returns evidence counts in condition order", () => {
    const database = createDatabase({
      anon_evidence: [
        ["product_view", "2026-09-28T12:00:00.000Z"],
        ["product_view", "2026-09-27T12:00:00.000Z"],
        ["purchase", "2026-09-28T13:00:00.000Z"]
      ]
    });

    const result = evaluateAudience(requestWithConditions([
      { eventType: "product_view", operator: "at_least", count: 2, withinDays: 7 },
      { eventType: "purchase", operator: "exactly", count: 1, withinDays: 7 }
    ]), database);

    expect(result.members[0]?.evidence).toEqual([
      { eventType: "product_view", observedCount: 2 },
      { eventType: "purchase", observedCount: 1 }
    ]);
  });

  it("returns an empty result when no users match", () => {
    const database = createDatabase({
      anon_no_match: [["product_view", "2026-09-28T12:00:00.000Z"]]
    });

    const result = evaluateAudience(requestWithConditions([
      { eventType: "product_view", operator: "at_least", count: 2, withinDays: 7 }
    ]), database);

    expect(result).toEqual({
      name: "Test audience",
      asOf,
      total: 0,
      members: []
    });
  });
});
