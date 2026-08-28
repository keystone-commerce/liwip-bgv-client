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
        <Brand />
        <span className={`service-state ${backendReady === false ? "is-offline" : ""}`} title={serviceText} aria-label={serviceText}>
          <i aria-hidden="true" />
        </span>
      </header>

      <main id="main">
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-hero-copy scroll-reveal">
            <h1 id="landing-title">Get verified once.<br />Work <em>anywhere.</em></h1>
            <p className="landing-lead">One application covers every check your work needs. The result is a credential you keep for twelve months.</p>

            <div className="role-choices" aria-label="Choose how to continue">
              <button className="role-choice" type="button" onClick={onWorker}>
                <span className="role-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="16" rx="2" />
                    <circle cx="12" cy="10" r="3" />
                    <path d="M7 17c0-2 2.2-3.5 5-3.5s5 1.5 5 3.5" />
                  </svg>
                </span>
                <span className="role-copy"><strong>{t("home.worker")}</strong><small>Delivery, driving, home services or security</small></span>
                <span className="role-status status-available">{t("home.available")}</span>
                <span className="role-arrow" aria-hidden="true">→</span>
              </button>
              <button className="role-choice" type="button" onClick={onOrganisation}>
                <span className="role-icon role-icon-muted" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="2" width="16" height="20" rx="2" />
                    <path d="M9 22v-4h6v4" />
                    <path d="M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01" />
                  </svg>
                </span>
                <span className="role-copy"><strong>{t("home.organisation")}</strong><small>Verify workers at scale with role-based packages</small></span>
                <span className="role-status status-soon">{t("home.soon")}</span>
                <span className="role-arrow" aria-hidden="true">→</span>
              </button>
            </div>

            <button className="continue-link" type="button" onClick={onWorker}>Already started? <span>Continue where you left off</span></button>
          </div>

          <div className="landing-card-visual scroll-reveal" aria-label="Example LIWIP Gig Card">
            <div
              className="card-photo-crop"
              onMouseMove={handleCardMouseMove}
              onMouseLeave={handleCardMouseLeave}
              style={{
                transform: `perspective(900px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) scale(${tilt.scale})`,
                transition: tilt.active ? "transform 100ms cubic-bezier(.2, .8, .3, 1)" : "transform 400ms ease-out"
              }}
            >
              <Image
                className="card-photo-source"
                src="/liwip-gig-card.png"
                alt="Example LIWIP verified gig worker card"
                width={1798}
                height={1376}
                priority
                sizes="(max-width: 900px) 92vw, 42vw"
              />
            </div>
          </div>
        </section>

        <section className="how-section" aria-labelledby="how-title">
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

        <section className="package-section" aria-labelledby="packages-title">
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
