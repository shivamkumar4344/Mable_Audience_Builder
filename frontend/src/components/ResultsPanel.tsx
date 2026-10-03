import type { PreviewState } from "../hooks/useAudiencePreview";

interface ResultsPanelProps {
  state: PreviewState;
  onRetry: () => void;
}

export function ResultsPanel({ state, onRetry }: ResultsPanelProps) {
  if (state.status === "idle") {
    return <section className="results-panel" aria-live="polite"><p className="muted">Preview results will appear here.</p></section>;
  }

  if (state.status === "loading") {
    return <section className="results-panel" aria-live="polite"><p className="status-message">Loading audience preview...</p></section>;
  }

  if (state.status === "error") {
    return (
      <section className="results-panel" aria-live="polite">
        <p className="error-message">{state.error.message}</p>
        {state.error.details.length > 0 && (
          <ul className="error-details">
            {state.error.details.map((detail) => <li key={`${detail.path}-${detail.message}`}>{detail.path}: {detail.message}</li>)}
          </ul>
        )}
        <button type="button" className="button button--accent" onClick={onRetry}>Retry</button>
      </section>
    );
  }

  if (state.data.total === 0) {
    return <section className="results-panel" aria-live="polite"><p className="empty-message">No users match this audience.</p></section>;
  }

  return (
    <section className="results-panel" aria-live="polite">
      <div className="results-heading">
        <div>
          <p className="eyebrow">Preview result</p>
          <h2>{state.data.name}</h2>
        </div>
        <strong className="audience-size">{state.data.total}<span> users</span></strong>
      </div>
      <table>
        <caption>Audience members and observed event counts</caption>
        <thead>
          <tr>
            <th scope="col">Anonymous ID</th>
            <th scope="col">Evidence</th>
          </tr>
        </thead>
        <tbody>
          {state.data.members.map((member) => (
            <tr key={member.anonymousId}>
              <td className="member-id">{member.anonymousId}</td>
              <td>
                <ul className="evidence-list">
                  {member.evidence.map((evidence) => <li key={evidence.eventType}><span>{evidence.eventType}</span><strong>{evidence.observedCount}</strong></li>)}
                </ul>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
