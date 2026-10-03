# Design Notes

## Data model

`anonymous_users` stores one row per synthetic anonymous user, keyed by `id`. Keeping this table separate from `events` is important: a user with no events in a time window, or no events at all, must still be eligible for an `exactly 0` rule.

`events` stores an autoincrementing `id`, the user reference, a whitelisted event type, and a UTC ISO-8601 `occurred_at` value. An index on `(anonymous_id, event_type, occurred_at)` supports the per-user, per-event-type time-window scan.

## Evaluation choice

The evaluator uses one parameterized SQL query. It starts with `anonymous_users`, left joins `events`, groups by user, and creates one conditional aggregate per condition. Each aggregate counts only the requested event type inside that condition's time window. `HAVING` clauses then apply the condition operator and count.

This choice keeps AND semantics in the database, includes users with no matching events, and avoids loading all events into application memory. The event type and every rule value are bound parameters. The only SQL fragments generated dynamically are fixed aliases and operators selected from validated values. Evidence is read directly from those same aggregate columns, so displayed counts cannot disagree with membership.

## Time windows

An event counts when it occurs in the half-open interval **(asOf - N days, asOf]**. In SQL this is `occurred_at > windowStart AND occurred_at <= asOf`. The lower boundary is excluded, the event exactly at `asOf` is included, and events after `asOf` are ignored. The request's `asOf` is the only clock input; the server clock is never consulted.

## Scaling trade-off

The current design scans relevant event rows for every preview. This is easy to reason about and appropriate for synthetic take-home data, but repeated previews over a large event table will eventually become expensive. At higher volume, a practical next step would be daily per-user event-count aggregates, with previews reading a much smaller summary table. A columnar analytics store could support larger historical scans, while caching previews by a normalized rule hash and `asOf` would reduce duplicate work. Those options add freshness, storage, and invalidation complexity, so the current per-request query is the better fit here.
