import { useState } from "react";
import type { AudienceCondition, PreviewRequest } from "../api/types";
import { ConditionEditor } from "./ConditionEditor";

interface AudienceFormProps {
  isLoading: boolean;
  onPreview: (request: PreviewRequest) => void;
}

type FieldErrors = Record<string, string>;

const initialCondition: AudienceCondition = {
  eventType: "product_view",
  operator: "at_least",
  count: 2,
  withinDays: 7
};

const audienceNames = [
  "Viewed but not purchased",
  "High-intent product browsers",
  "Cart builders",
  "Checkout starters"
] as const;

function validate(name: string, asOf: string, conditions: AudienceCondition[]): FieldErrors {
  const errors: FieldErrors = {};
  if (name.trim().length === 0) errors.name = "Name is required.";
  else if (name.length > 100) errors.name = "Name must be 100 characters or fewer.";
  if (asOf.length === 0 || Number.isNaN(new Date(asOf).getTime())) errors.asOf = "Enter a valid date and time.";
  if (conditions.length === 0) errors.conditions = "Add at least one condition.";

  conditions.forEach((condition, index) => {
    const prefix = `conditions.${index}`;
    if (!Number.isInteger(condition.count) || condition.count < 0) {
      errors[`${prefix}.count`] = "Count must be a whole number of 0 or more.";
    } else if (condition.operator === "at_least" && condition.count < 1) {
      errors[`${prefix}.count`] = "At least requires count to be 1 or more.";
    }
    if (!Number.isInteger(condition.withinDays) || condition.withinDays < 1 || condition.withinDays > 90) {
      errors[`${prefix}.withinDays`] = "Within days must be a whole number from 1 to 90.";
    }
  });

  return errors;
}

export function AudienceForm({ isLoading, onPreview }: AudienceFormProps) {
  const [name, setName] = useState("Viewed but not purchased");
  const [asOf, setAsOf] = useState("2026-09-29T00:00");
  const [conditions, setConditions] = useState<AudienceCondition[]>([
    initialCondition,
    { eventType: "purchase", operator: "exactly", count: 0, withinDays: 7 }
  ]);
  const [errors, setErrors] = useState<FieldErrors>({});

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(name, asOf, conditions);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onPreview({ name: name.trim(), asOf: new Date(asOf).toISOString(), conditions });
  }

  function updateCondition(index: number, condition: AudienceCondition) {
    setConditions((current) => current.map((item, itemIndex) => itemIndex === index ? condition : item));
  }

  function removeCondition(index: number) {
    setConditions((current) => current.filter((_condition, itemIndex) => itemIndex !== index));
  }

  return (
    <form className="audience-form" onSubmit={handleSubmit} noValidate>
      <div className="form-intro">
        <p className="eyebrow">Audience definition</p>
        <h1>Build a precise audience.</h1>
        <p>Combine behavioral signals into a previewable segment.</p>
      </div>
      <div className="form-fields">
        <div className="field">
          <label htmlFor="audience-name">Audience name</label>
          <select id="audience-name" value={name} onChange={(event) => setName(event.target.value)} aria-invalid={Boolean(errors.name)}>
            {audienceNames.map((audienceName) => <option key={audienceName} value={audienceName}>{audienceName}</option>)}
          </select>
          {errors.name && <span className="field-error">{errors.name}</span>}
        </div>
        <div className="field">
          <label htmlFor="as-of">As of</label>
          <input id="as-of" type="datetime-local" value={asOf} onChange={(event) => setAsOf(event.target.value)} aria-invalid={Boolean(errors.asOf)} />
          {errors.asOf && <span className="field-error">{errors.asOf}</span>}
        </div>
      </div>
      <fieldset>
        <legend>Conditions</legend>
        <p className="fieldset-help">Every condition must be true for a user to appear in the preview.</p>
        {conditions.map((condition, index) => (
          <ConditionEditor
            key={index}
            condition={condition}
            index={index}
            errors={{
              count: errors[`conditions.${index}.count`],
              withinDays: errors[`conditions.${index}.withinDays`],
              eventType: errors[`conditions.${index}.eventType`],
              operator: errors[`conditions.${index}.operator`]
            }}
            canRemove={conditions.length > 1}
            onChange={(nextCondition) => updateCondition(index, nextCondition)}
            onRemove={() => removeCondition(index)}
          />
        ))}
        {errors.conditions && <span className="field-error">{errors.conditions}</span>}
        <button type="button" className="button button--quiet add-condition" onClick={() => setConditions((current) => [...current, { ...initialCondition }])}>+ Add condition</button>
      </fieldset>
      <button type="submit" className="button button--accent preview-button" disabled={isLoading}>
        {isLoading ? "Previewing..." : "Preview audience"}
      </button>
    </form>
  );
}
