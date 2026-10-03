import { openDatabase } from "./db";

const asOf = "2026-09-29T00:00:00.000Z";

const users = [
  // Clear match: 3 product views in the last 7 days and no purchases.
  { id: "anon_clear_match", events: [
    ["product_view", "2026-09-28T12:00:00.000Z"],
    ["product_view", "2026-09-27T12:00:00.000Z"],
    ["product_view", "2026-09-26T12:00:00.000Z"]
  ] },
  // Clear non-match: 3 product views and 1 purchase in the window.
  { id: "anon_clear_non_match", events: [
    ["product_view", "2026-09-28T12:00:00.000Z"],
    ["product_view", "2026-09-27T12:00:00.000Z"],
    ["product_view", "2026-09-26T12:00:00.000Z"],
    ["purchase", "2026-09-28T13:00:00.000Z"]
  ] },
  // Below threshold: only 1 product view in the window.
  { id: "anon_below_threshold", events: [["product_view", "2026-09-28T12:00:00.000Z"]] },
  // Threshold boundary: exactly 2 product views in the window.
  { id: "anon_boundary_match", events: [
    ["product_view", "2026-09-28T12:00:00.000Z"],
    ["product_view", "2026-09-27T12:00:00.000Z"]
  ] },
  // Window boundary: the lower-bound event is excluded, while the just-inside event is included.
  { id: "anon_window_boundary", events: [
    ["product_view", "2026-09-22T00:00:00.000Z"],
    ["product_view", "2026-09-22T00:00:01.000Z"]
  ] },
  // Future event: after asOf and therefore ignored by the evaluator.
  { id: "anon_after_as_of", events: [["product_view", "2026-09-29T00:00:01.000Z"]] },
  // Old purchase: outside the 7-day window, so this user has no purchase in the window.
  { id: "anon_old_purchase", events: [["purchase", "2026-09-21T23:59:59.000Z"]] },
  // Zero events: retained in anonymous_users so exactly-zero rules can include this user.
  { id: "anon_zero_events", events: [] }
] as const;

const database = openDatabase();
const insertUser = database.prepare("INSERT INTO anonymous_users (id) VALUES (?)");
const insertEvent = database.prepare(
  "INSERT INTO events (anonymous_id, event_type, occurred_at) VALUES (?, ?, ?)"
);

const seed = database.transaction(() => {
  database.exec("DELETE FROM events; DELETE FROM anonymous_users;");

  for (const user of users) {
    insertUser.run(user.id);
    for (const [eventType, occurredAt] of user.events) {
      insertEvent.run(user.id, eventType, occurredAt);
    }
  }
});

seed();
console.log(`Seeded ${users.length} users for asOf ${asOf}`);
database.close();
