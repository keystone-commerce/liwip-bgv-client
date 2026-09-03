"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Brand } from "../primitives";
import { t } from "@/lib/i18n";
import type { VerificationPackage } from "@/lib/types";

interface RoleSplitHomeProps {
  packages: VerificationPackage[];
  backendReady: boolean | null;
  hasDraft: boolean;
  onWorker: () => void;
  onOrganisation: () => void;
}

const HOW_IT_WORKS = [
  { number: "01", title: "Choose your work", text: "We include only the checks that your role needs." },
  { number: "02", title: "Give your consent", text: "You approve every check separately. Nothing is pre-selected." },
  { number: "03", title: "Add your details", text: "Follow one simple form for identity, work and vehicle details." },
  { number: "04", title: "Track the result", text: "See each check and fix anything that needs another attempt." }
];

const packageOrder = ["BASIC_ID", "FACTORY_WAREHOUSE", "RIDER", "HOME_SERVICES", "DRIVER", "SECURITY"];

function formatPrice(price?: number) {
  if (price === undefined) return "Price unavailable";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(price);
}

export function RoleSplitHome({ packages, backendReady, hasDraft, onWorker, onOrganisation }: RoleSplitHomeProps) {
  const orderedPackages = [...packages].sort((a, b) => packageOrder.indexOf(a.code) - packageOrder.indexOf(b.code));
  const serviceText = backendReady === false ? "Verification service unavailable" : backendReady ? "Verification service online" : "Checking verification service";
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, scale: 1, active: false });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    const elements = document.querySelectorAll(".scroll-reveal");
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  function handleCardMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -10;
    const rotateY = ((x - centerX) / centerX) * 10;

    setTilt({ rotateX, rotateY, scale: 1.02, active: true });
  }

  function handleCardMouseLeave() {
    setTilt({ rotateX: 0, rotateY: 0, scale: 1, active: false });
  }

  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="landing-header-inner">
          <Brand />
          <nav className="landing-nav" aria-label="Main navigation">
            <a href="#how-it-works">How it works</a>
            <a href="#packages">Packages</a>
            <button type="button" onClick={onOrganisation}>For organisations</button>
          </nav>
          <div className="landing-header-actions">
            <span className={`service-state ${backendReady === false ? "is-offline" : ""}`} title={serviceText} aria-label={serviceText}>
              <i aria-hidden="true" />
            </span>
            <button className="header-cta" type="button" onClick={onWorker}>Start verification <span aria-hidden="true">→</span></button>
          </div>
        </div>
      </header>

      <main id="main">
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-hero-copy">
            <h1 id="landing-title">
              <span>A trusted identity for</span>
              <span>India&apos;s <em>gig</em></span>
              <span><em>economy.</em></span>
            </h1>
            <p className="landing-lead">LIWIP brings identity, background and work checks into one portable verification that workers can carry across platforms.</p>
            <div className="hero-actions">
              <button className="hero-action hero-action-primary" type="button" onClick={onWorker}>Start verification <span aria-hidden="true">→</span></button>
              <a className="hero-action hero-action-secondary" href="#how-it-works">See how it works</a>
            </div>
            {hasDraft && <button className="continue-link" type="button" onClick={onWorker}>Already started? <span>Continue where you left off</span></button>}
          </div>
        </section>

        <section className="role-section" aria-labelledby="role-title">
          <div className="role-section-copy scroll-reveal">
            <p className="section-label">Choose your path</p>
            <h2 id="role-title">One credential.<br />Two ways to begin.</h2>
            <p>Workers can verify themselves. Organisations can invite and verify their workforce at scale.</p>
            <div className="role-choices" aria-label="Choose how to continue">
              <button className="role-choice" type="button" onClick={onWorker}>
                <span className="role-number" aria-hidden="true">01</span>
                <span className="role-copy"><strong>{t("home.worker")}</strong><small>Delivery, driving, home services or security</small></span>
                <span className="role-status status-available">{t("home.available")}</span>
                <span className="role-arrow" aria-hidden="true">→</span>
              </button>
              <button className="role-choice" type="button" onClick={onOrganisation}>
                <span className="role-number" aria-hidden="true">02</span>
                <span className="role-copy"><strong>{t("home.organisation")}</strong><small>Verify workers at scale with role-based packages</small></span>
                <span className="role-status status-soon">{t("home.soon")}</span>
                <span className="role-arrow" aria-hidden="true">→</span>
              </button>
            </div>
          </div>

          <div className="landing-card-stage scroll-reveal" aria-label="LIWIP Gig Card preview">
            <div className="landing-card-visual">
              <div
                className="card-photo-crop"
                onMouseMove={handleCardMouseMove}
                onMouseLeave={handleCardMouseLeave}
                style={{
                  transform: `perspective(900px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) scale(${tilt.scale})`,
                  transition: tilt.active ? "transform 100ms cubic-bezier(.2, .8, .3, 1)" : "transform 400ms ease-out"
                }}
              >
                <Image className="card-photo-source" src="/liwip-gig-card.png" alt="Example LIWIP verified gig worker card" width={1798} height={1376} priority sizes="(max-width: 900px) 92vw, 38vw" />
              </div>
            </div>
          </div>
        </section>

        <section className="how-section" id="how-it-works" aria-labelledby="how-title">
          <div className="section-intro section-intro-dark scroll-reveal">
            <p>How it works</p>
            <h2 id="how-title">Four steps, and you can stop at any point.</h2>
          </div>
          <div className="how-grid">
            {HOW_IT_WORKS.map((step) => (
              <article key={step.number} className="scroll-reveal">
                <span>{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="package-section" id="packages" aria-labelledby="packages-title">
          <div className="section-intro scroll-reveal">
            <p>Packages</p>
            <h2 id="packages-title">Priced by the work,<br />not the person.</h2>
          </div>
          <div className="package-list">
            {orderedPackages.map((item) => (
              <button className={`package-row scroll-reveal ${item.code === "RIDER" ? "is-featured" : ""}`} type="button" key={item.code} onClick={onWorker}>
                <span><strong>{item.name}</strong><small>{item.targetWorkforce || item.description}</small></span>
                <small>{item.advertisedCheckCount || item.checks.length} checks</small>
                <b>{formatPrice(item.priceInr)}</b>
                <i aria-hidden="true">→</i>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
