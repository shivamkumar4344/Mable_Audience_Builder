import type Database from "better-sqlite3";
import type {
  AudienceCondition,
  AudienceMember,
  PreviewRequest,
  PreviewResponse
} from "./audience";

interface EvaluationRow {
  anonymous_id: string;
  [column: string]: string | number;
}

function getWindowStart(asOf: string, withinDays: number): string {
  const asOfMilliseconds = Date.parse(asOf);
  return new Date(asOfMilliseconds - withinDays * 24 * 60 * 60 * 1000).toISOString();
}

function buildCountExpression(condition: AudienceCondition, index: number): string {
  const column = `condition_${index}`;
  return `SUM(CASE WHEN e.event_type = ? AND e.occurred_at > ? AND e.occurred_at <= ? THEN 1 ELSE 0 END) AS ${column}`;
}

function buildHavingClause(condition: AudienceCondition, index: number): string {
  const aggregate = `condition_${index}`;
  return condition.operator === "at_least"
    ? `${aggregate} >= ?`
    : `${aggregate} = ?`;
}

function buildParameters(request: PreviewRequest): Array<string | number> {
  const parameters: Array<string | number> = [];

  for (const condition of request.conditions) {
    parameters.push(
      condition.eventType,
      getWindowStart(request.asOf, condition.withinDays),
      request.asOf
    );
  }

  for (const condition of request.conditions) {
    parameters.push(condition.count);
  }

  return parameters;
}

export function evaluateAudience(
  request: PreviewRequest,
  database: Database.Database
): PreviewResponse {
  const countExpressions = request.conditions
    .map(buildCountExpression)
    .join(",\n        ");
  const havingClauses = request.conditions
    .map(buildHavingClause)
    .join(" AND ");

  // The window is (asOf - withinDays days, asOf]. Events after asOf are ignored.
  const query = `
    SELECT
      u.id AS anonymous_id,
      ${countExpressions}
    FROM anonymous_users AS u
    LEFT JOIN events AS e ON e.anonymous_id = u.id
    GROUP BY u.id
    HAVING ${havingClauses}
    ORDER BY u.id ASC
  `;

  const rows = database.prepare(query).all(...buildParameters(request)) as EvaluationRow[];
  const members: AudienceMember[] = rows.map((row) => ({
    anonymousId: row.anonymous_id,
    evidence: request.conditions.map((condition, index) => ({
      eventType: condition.eventType,
      observedCount: Number(row[`condition_${index}`])
    }))
  }));

  return {
    name: request.name,
    asOf: request.asOf,
    total: members.length,
    members
  };
}
