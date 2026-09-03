"use client";

import { useEffect, useState, useRef, type MouseEvent } from "react";
import Image from "next/image";
import type { VerificationPackage } from "@/lib/types";

interface EditorialHomeProps {
  packages: VerificationPackage[];
  backendReady: boolean | null;
  hasDraft: boolean;
  onWorker: () => void;
  onOrganisation: () => void;
}

const PROBLEMS = [
  {
    number: "i.",
    title: "The same checks, repeated",
    text: "Workers submit the same identity, address, and criminal background documents every single time they onboard with a new platform or employer."
  },
  {
    number: "ii.",
    title: "No portable proof",
    text: "A completed background check stays locked inside one company's closed system, leaving gig workers with zero reusable proof of verification."
  },
  {
    number: "iii.",
    title: "One process for every role",
    text: "Generic screening adds unnecessary cost and friction by demanding checks that specific gig roles do not require."
  }
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

function useCountUp(target: number, isVisible: boolean, durationMs = 1200) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isVisible) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCount(target);
      return;
    }

    let startTimestamp: number | null = null;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      } else {
        setCount(target);
      }
    };

    animationFrameId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [target, isVisible, durationMs]);

  return count;
}

export function EditorialHome({ packages, backendReady, hasDraft, onWorker, onOrganisation }: EditorialHomeProps) {
  const orderedPackages = [...packages].sort((a, b) => packageOrder.indexOf(a.code) - packageOrder.indexOf(b.code));
  const packageCount = orderedPackages.length || 6;
  const serviceText = backendReady === false ? "Verification service offline" : backendReady ? "Verification service online" : "Checking verification service";

  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, scale: 1, active: false });
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const navSentinelRef = useRef<HTMLDivElement>(null);

  const count12M = useCountUp(12, statsVisible);
  const count12Mo = useCountUp(12, statsVisible);
  const countPackages = useCountUp(packageCount, statsVisible);
  const count1 = useCountUp(1, statsVisible);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    const elements = document.querySelectorAll(".editorial-reveal");
    elements.forEach((el) => observer.observe(el));

    const statsElement = statsRef.current;
    let statsObserver: IntersectionObserver | undefined;
    if (statsElement) {
      statsObserver = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            setStatsVisible(true);
            statsObserver?.disconnect();
          }
        },
        { threshold: 0.2 }
      );
      statsObserver.observe(statsElement);
    }

    // Condense the nav once the top sentinel scrolls out of view.
    const sentinel = navSentinelRef.current;
    let navObserver: IntersectionObserver | undefined;
    if (sentinel && navRef.current) {
      navObserver = new IntersectionObserver(
        (entries) => {
          navRef.current?.classList.toggle("is-scrolled", !entries[0].isIntersecting);
        },
        { threshold: 0 }
      );
      navObserver.observe(sentinel);
    }

    return () => {
      observer.disconnect();
      statsObserver?.disconnect();
      navObserver?.disconnect();
    };
  }, []);

  function handleDoorClick(e: MouseEvent<HTMLAnchorElement>, callback: () => void) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
    e.preventDefault();
    callback();
  }

  function handleCardMouseMove(event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -8;
    const rotateY = ((x - centerX) / centerX) * 8;
    setTilt({ rotateX, rotateY, scale: 1.02, active: true });
  }

  function handleCardMouseLeave() {
    setTilt({ rotateX: 0, rotateY: 0, scale: 1, active: false });
  }

  return (
    <div className="editorial-page">
      <div ref={navSentinelRef} aria-hidden="true" style={{ position: "absolute", top: 0, height: 1, width: 1 }} />
      <header className="editorial-nav-shell" ref={navRef}>
        <div className="editorial-container editorial-nav-inner">
          <a href="/" className="editorial-brand" aria-label="Liwip — Live With Pride, home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="editorial-brand-mark" src="/liwip-logo.svg" alt="" width={36} height={36} />
            <span className="editorial-brand-lockup">
              <span className="editorial-brand-name">Liwip</span>
              <span className="editorial-brand-tag">Live With Pride.</span>
            </span>
          </a>
          <nav className="editorial-nav-links" aria-label="Main navigation">
            <a href="#about">About</a>
            <a href="#packages">Packages</a>
            <a href="#contact">Contact</a>
          </nav>
          <a
            className="editorial-button editorial-button-primary editorial-nav-cta"
            href="#contact"
            onClick={(e) => handleDoorClick(e, () => {
              const contactEl = document.getElementById("contact");
              contactEl?.scrollIntoView({ behavior: "smooth" });
            })}
          >
            Get in touch <span aria-hidden="true">→</span>
          </a>
        </div>
      </header>

      <main id="main">
        <section className="editorial-credential editorial-section editorial-credential-front" id="about" aria-labelledby="traction-title">
          <div className="editorial-container editorial-credential-inner editorial-reveal">
            <div>
              <h2 id="traction-title">Building <em className="editorial-punchline">trust</em> across India&apos;s <em className="editorial-punchline">fastest-growing platforms.</em></h2>
              <p>
                We&apos;re transforming background verification from a one-off corporate gatekeeper into a portable asset that empowers workers and simplifies onboarding for platforms. Completed checks become a portable LIWIP Gig Card, easy to present and simple to verify.
              </p>
              <a
                className="editorial-button editorial-button-primary"
                href="?as=worker"
                onClick={(e) => handleDoorClick(e, onWorker)}
              >
                Get your Gig Card <span aria-hidden="true">→</span>
              </a>
            </div>
            <div className="editorial-card-visual" aria-label="Example LIWIP Gig Card">
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
                  alt="Example LIWIP verified gig worker card credential"
                  width={1798}
                  height={1376}
                  priority
                  sizes="(max-width: 900px) 88vw, 460px"
                />
              </div>
            </div>
          </div>
        </section>
        {/* TWO ENTRY POINTS */}
        <section className="editorial-section editorial-entry-section" aria-labelledby="entry-title">
          <div className="editorial-container editorial-reveal">
            <h2 id="entry-title" className="editorial-entry-heading">Two ways in. Choose where you <em>begin.</em></h2>
            <div className="editorial-entry-doors">
              <div className="editorial-doors-grid">
                <a
                  className="editorial-door-row"
                  href="?as=worker"
                  onClick={(e) => handleDoorClick(e, onWorker)}
                  aria-label="I am a worker — get verified"
                >
                  <span className="editorial-door-icon" aria-hidden="true">
                    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="8" r="3.6" /><path d="M4.6 20c.9-3.7 3.8-5.6 7.4-5.6s6.5 1.9 7.4 5.6" />
                    </svg>
                  </span>
                  <span className="editorial-door-content">
                    <span className="editorial-door-title">I am a worker</span>
                    <span className="editorial-door-desc">Get verified once and carry a trusted work credential across platforms.</span>
                  </span>
                  <span className="editorial-door-foot">
                    <span className="editorial-door-badge" style={{ background: "#E9F5EF", color: "#0F6B4C" }}>Available</span>
                    <span className="editorial-door-arrow" aria-hidden="true">→</span>
                  </span>
                </a>

                <a
                  className="editorial-door-row"
                  href="?as=organisation"
                  onClick={(e) => handleDoorClick(e, onOrganisation)}
                  aria-label="I am an organisation — verify workers at scale"
                >
                  <span className="editorial-door-icon" aria-hidden="true">
                    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3.5 20.8h17" /><path d="M6 20.8V6.2c0-.5.4-.9.9-.9h6.2c.5 0 .9.4.9.9v14.6" /><path d="M14 20.8V10.4h3.1c.5 0 .9.4.9.9v9.5" /><path d="M9 8.5h2M9 12h2M9 15.5h2" />
                    </svg>
                  </span>
                  <span className="editorial-door-content">
                    <span className="editorial-door-title">I am an organisation</span>
                    <span className="editorial-door-desc">Verify gig workforces at scale with role-based screening packages.</span>
                  </span>
                  <span className="editorial-door-foot">
                    <span className="editorial-door-badge" style={{ background: "#FBF1DC", color: "#8A5100" }}>Coming soon</span>
                    <span className="editorial-door-arrow" aria-hidden="true">→</span>
                  </span>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* PROBLEM SECTION */}
        <section className="editorial-section" aria-labelledby="problem-title">
          <div className="editorial-container editorial-reveal">
            <p className="editorial-eyebrow">THE PROBLEM</p>
            <div className="editorial-section-lead">
              <h2 id="problem-title">Background checks were built for work that stayed still.</h2>
              <p>
                Gig work moves between platforms, employers, and cities. A worker&apos;s verified history should be able to move seamlessly with them.
              </p>
            </div>
            <div className="editorial-numbered-list">
              {PROBLEMS.map((problem, idx) => (
                <article key={problem.number} className={`editorial-reveal delay-${idx + 1}`}>
                  <span>{problem.number}</span>
                  <div>
                    <h3>{problem.title}</h3>
                    <p>{problem.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* TRACTION / CREDENTIAL SECTION */}

        {/* VERIFICATION PACKAGES */}
        <section className="editorial-section" id="packages" aria-labelledby="package-title">
          <div className="editorial-container editorial-reveal">
            <p className="editorial-eyebrow">SCREENING PACKAGES</p>
            <div className="editorial-section-lead">
              <h2 id="package-title">Priced by the work,<br />not the person.</h2>
              <p>
                Each package includes the exact checks relevant to that specific role. Workers and platforms do not pay for unnecessary screening.
              </p>
            </div>
            <div className="editorial-package-list">
              {orderedPackages.map((item) => (
                <button
                  type="button"
                  key={item.code}
                  onClick={onWorker}
                  aria-label={`Start verification for ${item.name}`}
                >
                  <span>
                    <strong>{item.name}</strong>
                    <small>{item.targetWorkforce || item.description}</small>
                  </span>
                  <small>{item.advertisedCheckCount || item.checks.length} checks</small>
                  <b>{formatPrice(item.priceInr)}</b>
                  <i aria-hidden="true">→</i>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* CONTACT SECTION */}
        <section className="editorial-section editorial-contact" id="contact" aria-labelledby="contact-title">
          <div className="editorial-container editorial-reveal">
            <p className="editorial-eyebrow">GET IN TOUCH</p>
            <h2 id="contact-title">We&apos;re easy to find.</h2>
            <div className="editorial-contact-grid">
              <article>
                <span>For workers</span>
                <h3>Get verified once.</h3>
                <p>Start a role-based background verification and carry your portable credential to any gig platform.</p>
                <a
                  className="editorial-contact-link"
                  href="?as=worker"
                  onClick={(e) => handleDoorClick(e, onWorker)}
                >
                  Start verification →
                </a>
              </article>

              <article>
                <span>For platforms</span>
                <h3>Verify your workforce.</h3>
                <p>Invite workers, choose customized packages, and monitor verification status from one unified portal.</p>
                <a
                  className="editorial-contact-link"
                  href="mailto:hello@liwip.com?subject=LIWIP%20enterprise%20platform%20inquiry"
                >
                  Talk to our team →
                </a>
              </article>

              <article>
                <span>Press &amp; partnerships</span>
                <h3>Media &amp; ecosystem.</h3>
                <p>For press inquiries, policy discussions, or ecosystem partnerships across India&apos;s gig economy.</p>
                <a
                  className="editorial-contact-link"
                  href="mailto:press@liwip.com?subject=LIWIP%20press%20and%20partnership%20inquiry"
                >
                  Contact press team →
                </a>
              </article>
            </div>
          </div>
        </section>

        {/* CLOSING CTA */}
        <section className="editorial-closing" aria-labelledby="closing-title">
          <div className="editorial-container editorial-reveal">
            <h2 id="closing-title">The gig economy needs an operating system.</h2>
            <p>One trusted verification that moves with the worker and gives every platform a clearer starting point.</p>
            <a
              className="editorial-button editorial-button-primary"
              href="?as=worker"
              onClick={(e) => handleDoorClick(e, onWorker)}
            >
              Start verification <span aria-hidden="true">→</span>
            </a>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="editorial-footer">
        <div className="editorial-container">
          <div className="editorial-footer-top">
            <p>
              Get verified once.<br />
              <em>Work anywhere.</em>
            </p>
            <div className="editorial-footer-links">
              <nav aria-label="Platform links">
                <strong>Platform</strong>
                <a href="#about">How it works</a>
                <a href="#packages">Packages</a>
              </nav>
              <nav aria-label="Company links">
                <strong>Company</strong>
                <a href="#about">About</a>
                <a href="#contact">Contact</a>
              </nav>
              <nav aria-label="Get started links">
                <strong>Get started</strong>
                <a href="?as=worker" onClick={(e) => handleDoorClick(e, onWorker)}>For workers</a>
                <a href="?as=organisation" onClick={(e) => handleDoorClick(e, onOrganisation)}>For platforms</a>
              </nav>
            </div>
          </div>
          <div className="editorial-footer-legal">
            <span>© {new Date().getFullYear()} LIWIP. All rights reserved.</span>
            <span className={backendReady === false ? "is-offline" : ""}>
              <i aria-hidden="true" />
              {serviceText}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
