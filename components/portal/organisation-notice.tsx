import { Brand } from "../primitives";

export function OrganisationNotice({ onBack, onWorker }: { onBack: () => void; onWorker: () => void }) {
  return (
    <main id="main" className="organisation-page">
      <header className="landing-header">
        <button className="brand-button" type="button" onClick={onBack} aria-label="Return to LIWIP home"><Brand /></button>
      </header>
      <section className="organisation-card">
        <p className="landing-kicker">For organisations</p>
        <h1>Organisation accounts are coming soon.</h1>
        <p>Manage worker invitations, package-based checks and verification results from one secure workspace.</p>
        <div className="organisation-actions">
          <a className="button button-primary" href="mailto:hello@liwip.com?subject=LIWIP%20organisation%20access">Request early access <span>→</span></a>
          <button className="button button-ghost" type="button" onClick={onWorker}>I am a worker instead</button>
        </div>
        <small>This opens your email app. No information is collected on this page.</small>
      </section>
    </main>
  );
}
