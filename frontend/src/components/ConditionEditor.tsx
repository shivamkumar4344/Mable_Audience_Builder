import type { ChangeEvent } from "react";
import type { AudienceCondition, EventType, Operator } from "../api/types";
import { eventTypes } from "../api/types";

interface ConditionErrors {
  eventType?: string;
  operator?: string;
  count?: string;
  withinDays?: string;
}

interface ConditionEditorProps {
  condition: AudienceCondition;
  index: number;
  errors: ConditionErrors;
  canRemove: boolean;
  onChange: (condition: AudienceCondition) => void;
  onRemove: () => void;
}

function updateNumber(value: string): number {
  return value === "" ? Number.NaN : Number(value);
}

export function ConditionEditor({
  condition,
  index,
  errors,
  canRemove,
  onChange,
  onRemove
}: ConditionEditorProps) {
  const conditionNumber = index + 1;
  const update = (changes: Partial<AudienceCondition>) => onChange({ ...condition, ...changes });
  const handleEventType = (event: ChangeEvent<HTMLSelectElement>) => {
    update({ eventType: event.target.value as EventType });
  };
  const handleOperator = (event: ChangeEvent<HTMLSelectElement>) => {
    update({ operator: event.target.value as Operator });
  };

  return (
    <div className="condition-row">
      <div className="condition-row__heading">
        <span>Condition {conditionNumber}</span>
        <button
          type="button"
          className="button button--quiet"
          onClick={onRemove}
          disabled={!canRemove}
          aria-label={`Remove condition ${conditionNumber}`}
        >
          Remove
        </button>
      </div>
      <div className="condition-fields">
        <div className="field">
          <label htmlFor={`event-type-${index}`}>Event type</label>
          <select id={`event-type-${index}`} value={condition.eventType} onChange={handleEventType}>
            {eventTypes.map((eventType) => <option key={eventType} value={eventType}>{eventType}</option>)}
          </select>
          {errors.eventType && <span className="field-error">{errors.eventType}</span>}
        </div>
        <div className="field">
          <label htmlFor={`operator-${index}`}>Operator</label>
          <select id={`operator-${index}`} value={condition.operator} onChange={handleOperator}>
            <option value="at_least">At least</option>
            <option value="exactly">Exactly</option>
          </select>
          {errors.operator && <span className="field-error">{errors.operator}</span>}
        </div>
        <div className="field">
          <label htmlFor={`count-${index}`}>Count</label>
          <input
            id={`count-${index}`}
            type="number"
            min="0"
            step="1"
            value={Number.isNaN(condition.count) ? "" : condition.count}
            onChange={(event) => update({ count: updateNumber(event.target.value) })}
            aria-invalid={Boolean(errors.count)}
          />
          {errors.count && <span className="field-error">{errors.count}</span>}
        </div>
        <div className="field">
          <label htmlFor={`within-days-${index}`}>Within days</label>
          <input
            id={`within-days-${index}`}
            type="number"
            min="1"
            max="90"
            step="1"
            value={Number.isNaN(condition.withinDays) ? "" : condition.withinDays}
            onChange={(event) => update({ withinDays: updateNumber(event.target.value) })}
            aria-invalid={Boolean(errors.withinDays)}
          />
          {errors.withinDays && <span className="field-error">{errors.withinDays}</span>}
        </div>
      </div>
    </div>
  );
}
