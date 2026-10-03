import { AudienceForm } from "./components/AudienceForm";
import { ResultsPanel } from "./components/ResultsPanel";
import { useAudiencePreview } from "./hooks/useAudiencePreview";
import "./styles.css";

export function App() {
  const { state, submit, retry } = useAudiencePreview();

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="wordmark" href="/">Mable<span>/</span>audiences</a>
        <span className="topbar-status"><span className="status-dot" />Synthetic data workspace</span>
      </header>
      <div className="workspace">
        <AudienceForm isLoading={state.status === "loading"} onPreview={submit} />
        <ResultsPanel state={state} onRetry={retry} />
      </div>
    </main>
  );
}
