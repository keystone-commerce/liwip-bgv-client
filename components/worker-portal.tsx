"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import Image from "next/image";
import { Brand, ChapterProgress, EmptyState, Field, Notice, SelectInput, StatusPill, SummaryItem, TextInput, ToggleRow, UploadBox } from "./primitives";
import { FLOW_STEPS, PACKAGE_OCCUPATION } from "@/lib/steps";
import { buildApplicationForm } from "@/lib/application-form";
import { uploadApplicationDocument } from "@/lib/document-upload";
import { EMPTY_DRAFT, FALLBACK_PACKAGES, OCCUPATIONS, messageFrom, prettyCheck } from "@/lib/worker-config";
import type { ApplicationResult, SecureDocument, VerificationPackage, VerificationResult, WorkerDraft } from "@/lib/types";

export function WorkerPortal({ onHome }: { onHome?: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<WorkerDraft>(EMPTY_DRAFT);
  const [packages, setPackages] = useState<VerificationPackage[]>(FALLBACK_PACKAGES);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [paymentCode, setPaymentCode] = useState("");
  const [paymentCoverage, setPaymentCoverage] = useState<{ covered: boolean; sponsor?: string; message?: string }>({ covered: false });
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [files, setFiles] = useState<{ aadhaar?: File; selfie?: File; idCard?: File }>({});
  const [application, setApplication] = useState<ApplicationResult | null>(null);
  const [secureDocuments, setSecureDocuments] = useState<SecureDocument[]>([]);
  const [uploadStatus, setUploadStatus] = useState("");
  const [backendReady, setBackendReady] = useState<boolean | null>(null);
  const restored = useRef(false);

  const current = FLOW_STEPS[stepIndex];
  const selectedPackage = packages.find((item) => item.code === draft.packageCode) || FALLBACK_PACKAGES[0];
  const requiresVehicle = ["RIDER", "DRIVER"].includes(draft.packageCode);
  const requiresReference = ["DRIVER", "HOME_SERVICES", "SECURITY"].includes(draft.packageCode);
  const requiresCourt = ["RIDER", "DRIVER", "HOME_SERVICES", "SECURITY", "FACTORY_WAREHOUSE"].includes(draft.packageCode);
  const update = <K extends keyof WorkerDraft>(key: K, value: WorkerDraft[K]) => setDraft((old) => ({ ...old, [key]: value }));

  useEffect(() => {
    const stored = sessionStorage.getItem("liwip-worker-draft");
    const storedStep = Number(sessionStorage.getItem("liwip-worker-step"));
    if (stored) {
      try {
        const saved = JSON.parse(stored);
        queueMicrotask(() => {
          setDraft({ ...EMPTY_DRAFT, ...saved });
          if (Number.isInteger(storedStep) && storedStep >= 0 && storedStep < FLOW_STEPS.length) setStepIndex(storedStep);
          else if (saved.otpVerified) setStepIndex(1);
          restored.current = true;
        });
      } catch { restored.current = true; }
    } else restored.current = true;
    fetch("/api/packages").then(async (response) => {
      if (!response.ok) { setBackendReady(false); return; }
      const data = await response.json();
      const list = Array.isArray(data) ? data : data.packages;
      if (Array.isArray(list) && list.length) { setPackages(list); setBackendReady(true); }
      else setBackendReady(false);
    }).catch(() => setBackendReady(false));
  }, []);

  useEffect(() => {
    if (!restored.current) return;
    sessionStorage.setItem("liwip-worker-draft", JSON.stringify(draft));
  }, [draft]);

  useEffect(() => {
    if (!restored.current) return;
    sessionStorage.setItem("liwip-worker-step", String(stepIndex));
  }, [stepIndex]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const returnedFromDigiLocker = params.get("digilocker") === "return";
    const returnedFromAadhaar = params.get("aadhaar") === "return";
    if (!returnedFromDigiLocker && !returnedFromAadhaar) return;
    queueMicrotask(() => {
      setNotice(returnedFromAadhaar
        ? "You have returned from Aadhaar verification. Checking the verification status…"
        : "You have returned from DigiLocker. Continue the application after confirming your document details.");
    });
    window.history.replaceState({}, "", window.location.pathname);
  }, []);

  const refreshApplication = useCallback(async () => {
    const id = draft.applicationId;
    if (!id) return;
    try {
      const response = await fetch(`/api/applications/${encodeURIComponent(id)}`, { cache: "no-store" });
      const data = await response.json();
      if (response.ok) setApplication(data);
      else setNotice(messageFrom(data, "Could not refresh this case"));
    } catch { setNotice("The status service is temporarily unavailable."); }
  }, [draft.applicationId]);

  const refreshAadhaarOvse = useCallback(async () => {
    const clientId = draft.aadhaarOvseClientId;
    if (!clientId) return;
    try {
      const statusResponse = await fetch(`/api/aadhaar/ovse/status?client_id=${encodeURIComponent(clientId)}`, { cache: "no-store" });
      const statusData = await statusResponse.json();
      if (!statusResponse.ok) throw new Error(messageFrom(statusData, "Could not check Aadhaar verification status"));
      const status = statusData.status as WorkerDraft["aadhaarOvseStatus"];
      setDraft((old) => ({ ...old, aadhaarOvseStatus: status }));

      if (status === "completed" && !draft.aadhaarOvseVerified) {
        const resultResponse = await fetch(`/api/aadhaar/ovse/result?client_id=${encodeURIComponent(clientId)}`, { cache: "no-store" });
        const result = await resultResponse.json();
        if (!resultResponse.ok) throw new Error(messageFrom(result, "Could not retrieve Aadhaar verification result"));
        const normalisedGender = result.gender === "M" ? "male" : result.gender === "F" ? "female" : undefined;
        setDraft((old) => ({
          ...old,
          aadhaarOvseStatus: "completed",
          aadhaarOvseVerified: true,
          fullName: old.fullName || result.fullName || "",
          dateOfBirth: old.dateOfBirth || result.dob || "",
          gender: old.gender || normalisedGender || "",
          pinCode: old.pinCode || result.pinCode || ""
        }));
        setNotice("Aadhaar identity verified successfully through Pehchaan.");
      } else if (status === "failed") setNotice(statusData.description || "Aadhaar verification failed. Start a new verification session to try again.");
      else if (status === "expired") setNotice(statusData.description || "The Aadhaar verification session expired. Start a new session to continue.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not check Aadhaar verification status");
    }
  }, [draft.aadhaarOvseClientId, draft.aadhaarOvseVerified]);

  useEffect(() => {
    if (current.code !== "W16" || !draft.applicationId) return;
    const initial = window.setTimeout(refreshApplication, 0);
    const timer = window.setInterval(refreshApplication, 4000);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); };
  }, [current.code, draft.applicationId, refreshApplication]);

  useEffect(() => {
    if (!draft.aadhaarOvseClientId || draft.aadhaarOvseVerified || ["failed", "expired"].includes(draft.aadhaarOvseStatus || "")) return;
    const initial = window.setTimeout(refreshAadhaarOvse, 0);
    const timer = window.setInterval(refreshAadhaarOvse, 4000);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); };
  }, [draft.aadhaarOvseClientId, draft.aadhaarOvseStatus, draft.aadhaarOvseVerified, refreshAadhaarOvse]);

  function goTo(index: number) {
    setNotice("");
    setStepIndex(Math.max(0, Math.min(FLOW_STEPS.length - 1, index)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function validateCurrent(): string | null {
    switch (current.code) {
      case "W01": return draft.otpVerified ? null : "Verify your mobile number to continue.";
      case "W04": return draft.coreConsent && draft.identityConsent && draft.addressConsent && draft.biometricConsent && (!requiresCourt || draft.criminalConsent) ? null : "Please provide the required permissions for this package.";
      case "W05": return draft.occupations.length ? null : "Select at least one occupation.";
      case "W06": return draft.fullName && draft.dateOfBirth && draft.gender && (!requiresCourt || draft.fatherName) ? null : requiresCourt ? "Name, date of birth, gender and father/guardian name are required for this package." : "Name, date of birth and gender are required.";
      case "W07": return draft.addressLine1 && draft.city && draft.state && /^\d{6}$/.test(draft.pinCode) ? null : "Enter a complete address and 6-digit PIN code.";
      case "W08": return /^[A-Z]{5}\d{4}[A-Z]$/.test(draft.panNumber) && files.idCard ? null : "Enter a valid PAN and upload one identity-card image.";
      case "W09": return !requiresVehicle || (draft.drivingLicenceNumber && draft.drivingLicenceDob && draft.vehicleRegistration) ? null : "Licence, licence DOB and vehicle registration are required for this package.";
      case "W12": return !requiresReference || (draft.referenceName && /^\d{10}$/.test(draft.referencePhone)) ? null : "Add a reference name and 10-digit mobile number.";
      case "W13": return files.selfie ? null : "Upload a clear recent selfie.";
      case "W14": return draft.declaration ? null : "Accept the declaration before continuing.";
      case "W15": {
        if (requiresCourt && !draft.fatherName.trim()) return "Enter the father or guardian name required for the court-record check.";
        if (requiresCourt && (!draft.addressLine1.trim() || !draft.city.trim() || !draft.state.trim() || !/^\d{6}$/.test(draft.pinCode))) return "Complete the worker address required for the court-record check.";
        if (!files.selfie || !files.idCard) return "Upload both a selfie and an identity-card image before submitting.";
        return paymentCoverage.covered ? null : draft.payer === "employer" ? "Apply a valid company payment code to continue." : "Online payment is not connected yet. Use a company payment code for this MVP.";
      }
      default: return null;
    }
  }

  async function next() {
    const error = validateCurrent();
    if (error) return setNotice(error);
    if (current.code === "W15" && !draft.applicationId) return submitApplication();
    goTo(stepIndex + 1);
  }

  async function sendOtp() {
    if (!/^\d{10}$/.test(draft.phone)) return setNotice("Enter a valid 10-digit Indian mobile number.");
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/auth/send-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: draft.phone }) });
      const data = await response.json();
      if (!response.ok) throw new Error(messageFrom(data, "Could not send OTP"));
      setOtpSent(true);
      setNotice("OTP sent. Enter the 6-digit code to continue.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not send OTP"); }
    finally { setBusy(false); }
  }

  async function verifyOtp() {
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/auth/verify-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: draft.phone, otp }) });
      const data = await response.json();
      if (!response.ok) throw new Error(messageFrom(data, "OTP verification failed"));
      update("otpVerified", true); goTo(1);
    } catch (error) { setNotice(error instanceof Error ? error.message : "OTP verification failed"); }
    finally { setBusy(false); }
  }

  async function resendOtp() {
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/auth/resend-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: draft.phone }) });
      const data = await response.json();
      if (!response.ok) throw new Error(messageFrom(data, "Could not resend OTP"));
      setNotice("A new OTP was sent to your mobile number.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not resend OTP"); }
    finally { setBusy(false); }
  }

  function resetOtp() {
    setOtp("");
    setOtpSent(false);
    setDraft((old) => ({ ...old, phone: "", otpVerified: false }));
  }

  async function applyPaymentCode() {
    if (paymentCode.trim().length < 4) return setPaymentCoverage({ covered: false, message: "Enter the company payment code" });
    setBusy(true);
    setPaymentCoverage({ covered: false });
    try {
      const response = await fetch("/api/payment-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: paymentCode })
      });
      const data = await response.json();
      if (!response.ok) return setPaymentCoverage({ covered: false, message: messageFrom(data, "Payment code could not be applied") });
      setPaymentCoverage({ covered: true, sponsor: data.sponsor, message: data.message });
      update("payer", "employer");
    } catch { setPaymentCoverage({ covered: false, message: "Payment-code service is temporarily unavailable" }); }
    finally { setBusy(false); }
  }

  function removePaymentCode() {
    setPaymentCode("");
    setPaymentCoverage({ covered: false });
  }

  async function startDigiLocker() {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/digilocker/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: draft.fullName, email: draft.email })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(messageFrom(data, "Could not start DigiLocker"));
      if (!data.url) throw new Error("DigiLocker did not return a secure link");
      window.location.assign(data.url);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not start DigiLocker");
      setBusy(false);
    }
  }

  async function startAadhaarOvse() {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/aadhaar/ovse/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: draft.fullName })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(messageFrom(data, "Could not start Aadhaar verification"));
      if (!data.webLink) throw new Error("Aadhaar verification did not return a secure Pehchaan link");
      const nextDraft: WorkerDraft = {
        ...draft,
        aadhaarOvseClientId: data.clientId,
        aadhaarOvseStatus: data.status || "pending",
        aadhaarOvseVerified: false
      };
      setDraft(nextDraft);
      sessionStorage.setItem("liwip-worker-draft", JSON.stringify(nextDraft));
      window.location.assign(data.webLink);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not start Aadhaar verification");
      setBusy(false);
    }
  }

  async function submitApplication() {
    if (!files.idCard || !files.selfie) {
      setNotice("Upload both a selfie and an identity-card image before submitting.");
      return;
    }
    setBusy(true); setNotice("");
    const form = buildApplicationForm(draft, files, requiresCourt);
    try {
      const response = await fetch("/api/applications", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(messageFrom(data, "Could not create verification case"));
      const id = data.id || data.application?.id;
      if (!id) throw new Error("We could not create the verification application.");
      setApplication(data.application || data);
      setDraft((old) => ({ ...old, applicationId: id }));
      const pendingUploads = [
        files.idCard ? { file: files.idCard, type: "ID_CARD" as const } : null,
        files.selfie ? { file: files.selfie, type: "SELFIE" as const } : null,
        files.aadhaar ? { file: files.aadhaar, type: "AADHAAR" as const } : null
      ].filter((item): item is { file: File; type: "ID_CARD" | "SELFIE" | "AADHAAR" } => Boolean(item));
      const stored: SecureDocument[] = [];
      for (let index = 0; index < pendingUploads.length; index += 1) {
        const item = pendingUploads[index];
        setUploadStatus(`Encrypting and storing document ${index + 1} of ${pendingUploads.length}…`);
        stored.push(await uploadApplicationDocument(id, item.file, item.type));
      }
      setSecureDocuments(stored);
      setUploadStatus("Documents stored securely");
      setNotice("Application submitted. Your documents are encrypted in private storage and verification has started.");
      goTo(15);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not create verification case"); }
    finally { setBusy(false); }
  }

  async function retry(id: string) {
    setBusy(true);
    try {
      const response = await fetch(`/api/verifications/${encodeURIComponent(id)}/retry`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(messageFrom(data, "Retry failed"));
      setNotice("Check queued again."); await refreshApplication();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Retry failed"); }
    finally { setBusy(false); }
  }

  const screen = renderScreen({ current: current.code, draft, update, packages, selectedPackage, files, setFiles, otp, setOtp, otpSent, sendOtp, resendOtp, verifyOtp, resetOtp, paymentCode, setPaymentCode, paymentCoverage, applyPaymentCode, removePaymentCode, startDigiLocker, startAadhaarOvse, busy, application, secureDocuments, uploadStatus, refreshApplication, retry, requiresVehicle, requiresReference, requiresCourt, goTo });

  return (
    <main id="main" className="app-shell">
      <header className="topbar">
        <button className="brand-button" type="button" onClick={onHome} aria-label="Return to LIWIP home"><Brand /></button>
        <div className="topbar-progress"><ChapterProgress steps={FLOW_STEPS} currentIndex={stepIndex} onGoTo={goTo} /></div>
        <div className="topbar-actions"><button className="topbar-home" type="button" onClick={onHome}>Home</button><span className={`secure-label ${backendReady === false ? "backend-offline" : ""}`}><i aria-hidden="true" /> {backendReady === false ? "Service unavailable" : backendReady ? "Service online" : "Secure session"}</span></div>
      </header>
      <aside className="sidebar">
        <ChapterProgress steps={FLOW_STEPS} currentIndex={stepIndex} onGoTo={goTo} />
        <div className="sidebar-help"><span aria-hidden="true">?</span><div><strong>Need help?</strong><small>Your progress is saved on this device.</small></div></div>
      </aside>
      <section className="workspace">
        <div className="workspace-inner">
          <div className="step-meta"><span>{current.eyebrow}</span><small>{current.code}</small></div>
          <h1>{current.title}</h1><p className="lead">{current.description}</p>
          {notice && <Notice tone={notice.toLowerCase().includes("failed") || notice.toLowerCase().includes("required") || notice.toLowerCase().includes("valid") ? "danger" : "info"}>{notice}</Notice>}
          <div className="screen-card">{screen}</div>
          {current.code !== "W01" && <div className="form-actions"><button className="button button-ghost" type="button" onClick={() => goTo(stepIndex - 1)} disabled={busy}>← Back</button>{current.code !== "W17" && <button className="button button-primary" type="button" onClick={next} disabled={busy}>{busy ? "Working…" : current.code === "W15" ? "Submit verification" : "Continue"} <span>→</span></button>}</div>}
          <p className="privacy-note"><span aria-hidden="true">🔒</span> Your data is encrypted in transit. Provider credentials never reach this browser.</p>
        </div>
      </section>
    </main>
  );
}

type ScreenProps = {
  current: string; draft: WorkerDraft; update: <K extends keyof WorkerDraft>(key: K, value: WorkerDraft[K]) => void;
  packages: VerificationPackage[]; selectedPackage: VerificationPackage; files: { aadhaar?: File; selfie?: File; idCard?: File };
  setFiles: Dispatch<SetStateAction<{ aadhaar?: File; selfie?: File; idCard?: File }>>; otp: string; setOtp: (value: string) => void;
  otpSent: boolean; sendOtp: () => void; resendOtp: () => void; verifyOtp: () => void; busy: boolean; application: ApplicationResult | null;
  secureDocuments: SecureDocument[]; uploadStatus: string;
  resetOtp: () => void;
  paymentCode: string; setPaymentCode: (value: string) => void;
  paymentCoverage: { covered: boolean; sponsor?: string; message?: string };
  applyPaymentCode: () => void; removePaymentCode: () => void;
  startDigiLocker: () => void;
  startAadhaarOvse: () => void;
  refreshApplication: () => void;
  retry: (id: string) => void; requiresVehicle: boolean; requiresReference: boolean; requiresCourt: boolean; goTo: (index: number) => void;
};

function renderScreen(props: ScreenProps) {
  return <ScreenContent {...props} />;
}

function ScreenContent(props: ScreenProps) {
  const { current, draft, update, files, setFiles } = props;
  if (current === "W01") return (
    <div className="narrow-stack">
      <Field label="Mobile number" hint="This becomes your worker account ID" required><div className="phone-input"><span>+91</span><TextInput inputMode="numeric" maxLength={10} placeholder="98765 43210" value={draft.phone} disabled={draft.otpVerified} onChange={(event) => update("phone", event.target.value.replace(/\D/g, ""))} /></div></Field>
      {draft.otpVerified && <><Notice tone="success"><strong>Mobile number verified</strong><br />You can continue to your Worker Board.</Notice><button className="button button-primary button-full" onClick={() => props.goTo(1)}>Continue to Worker Board <span>→</span></button><button className="otp-reset" onClick={props.resetOtp}>Use a different mobile number</button></>}
      {!props.otpSent && !draft.otpVerified && <button className="button button-primary button-full" onClick={props.sendOtp} disabled={props.busy}>Send secure OTP <span>→</span></button>}
      {props.otpSent && !draft.otpVerified && <><Field label="6-digit OTP" hint="Enter the OTP sent to this mobile number" required><TextInput className="input otp-input" inputMode="numeric" maxLength={6} value={props.otp} onChange={(event) => props.setOtp(event.target.value.replace(/\D/g, ""))} placeholder="000000" /></Field><button className="button button-primary button-full" onClick={props.verifyOtp} disabled={props.busy || props.otp.length !== 6}>Verify and continue <span>→</span></button><button className="otp-reset" onClick={props.resendOtp} disabled={props.busy}>Resend OTP</button></>}
      <p className="microcopy">By continuing, you agree to receive a one-time verification message. No marketing messages.</p>
    </div>
  );

  if (current === "W02") return (
    <div className="dashboard-grid">
      <div className="welcome-card"><span>Welcome</span><h2>{draft.fullName || "Build your verified work profile"}</h2><p>Complete one guided application. We only request information needed for your selected work.</p><button className="button button-primary" onClick={() => props.goTo(2)}>Start verification <span>→</span></button></div>
      <div className="metric-card"><span>Case status</span><strong>{draft.applicationId ? "In progress" : "Not started"}</strong><small>{draft.applicationId || "No active case"}</small></div>
      <div className="metric-card"><span>Document security</span><strong>Private storage</strong><small>Encrypted upload links expire automatically</small></div>
      <div className="timeline-card"><h3>How it works</h3><ol><li><b>1</b><span><strong>Choose work</strong><small>We select the right checks</small></span></li><li><b>2</b><span><strong>Provide details</strong><small>One secure, guided form</small></span></li><li><b>3</b><span><strong>Track every check</strong><small>See the verification status live</small></span></li></ol></div>
    </div>
  );

  if (current === "W03") return (
    <div className="package-grid">
      {props.packages.map((item) => <button key={item.code} className={`package-card ${draft.packageCode === item.code ? "selected" : ""}`} onClick={() => update("packageCode", item.code)}><span className="radio-dot" /><div><span className="package-kicker">{item.targetWorkforce || "Gig workforce"}</span><h3>{item.name}</h3><p>{item.description || `${item.advertisedCheckCount || item.checks.length} role-appropriate checks`}</p><div className="package-footer"><strong>₹{item.priceInr ?? "—"}</strong><small>{item.advertisedCheckCount || item.checks.length} checks · 12-month profile</small></div></div></button>)}
    </div>
  );

  if (current === "W04") return (
    <div className="consent-stack">
      <Notice>Permissions are recorded with a purpose, text version and timestamp. You can later request access or withdrawal.</Notice>
      <ToggleRow checked={draft.coreConsent} onChange={(value) => update("coreConsent", value)} title="Use my information for this verification case" description="Required to create and operate the case." required />
      <ToggleRow checked={draft.identityConsent} onChange={(value) => update("identityConsent", value)} title="Identity-document verification" description="PAN, voter ID, passport or Aadhaar document where provided." required />
      <ToggleRow checked={draft.addressConsent} onChange={(value) => update("addressConsent", value)} title="Address verification" description="Compare the submitted address with verified address records." required />
      <ToggleRow checked={draft.biometricConsent} onChange={(value) => update("biometricConsent", value)} title="Selfie, liveness and face matching" description="Biometric processing for presence and document-photo matching." required />
      {props.requiresCourt && <ToggleRow checked={draft.criminalConsent} onChange={(value) => update("criminalConsent", value)} title="Court-record search" description="Run a consented name and address based eCourts search." required />}
    </div>
  );

  if (current === "W05") return (
    <div className="occupation-grid">
      {OCCUPATIONS.map((item) => { const selected = draft.occupations.includes(item.id); return <button key={item.id} className={`occupation-card ${selected ? "selected" : ""}`} onClick={() => { const occupations = selected ? draft.occupations.filter((id) => id !== item.id) : [item.id]; update("occupations", occupations); if (!selected) update("packageCode", PACKAGE_OCCUPATION[item.id]); }}><span className="occupation-icon">{item.icon}</span><span><strong>{item.title}</strong><small>{item.detail}</small></span><i>{selected ? "✓" : "+"}</i></button>; })}
      <Notice tone="warning">Your primary occupation selects the package. Additional roles can be supported through a future package-composition service.</Notice>
    </div>
  );

  if (current === "W06") return (
    <div className="form-grid">
      <Field label="Full name" hint="Exactly as shown on your identity document" required><TextInput value={draft.fullName} onChange={(event) => update("fullName", event.target.value)} placeholder="Enter your full legal name" /></Field>
      <Field label="Date of birth" required><TextInput type="date" value={draft.dateOfBirth} onChange={(event) => update("dateOfBirth", event.target.value)} /></Field>
      <Field label="Gender" hint="Required only for specific verification checks" required><SelectInput value={draft.gender} onChange={(event) => update("gender", event.target.value)}><option value="">Select</option><option value="male">Male</option><option value="female">Female</option></SelectInput></Field>
      {props.requiresCourt && <Field label="Father or guardian name" hint="Required for the consented court-record search" required><TextInput value={draft.fatherName} onChange={(event) => update("fatherName", event.target.value)} placeholder="Enter full name" /></Field>}
      <Field label="Email address" hint="Optional notifications"><TextInput type="email" value={draft.email} onChange={(event) => update("email", event.target.value)} placeholder="name@example.com" /></Field>
      <Field label="Preferred language"><SelectInput value={draft.preferredLanguage} onChange={(event) => update("preferredLanguage", event.target.value)}><option>English</option><option>हिन्दी</option><option>বাংলা</option><option>मराठी</option><option>தமிழ்</option><option>తెలుగు</option></SelectInput></Field>
      <Field label="Alternate mobile" hint="Optional"><TextInput inputMode="numeric" maxLength={10} value={draft.alternatePhone} onChange={(event) => update("alternatePhone", event.target.value.replace(/\D/g, ""))} placeholder="10-digit number" /></Field>
    </div>
  );

  if (current === "W07") return (
    <div className="form-grid">
      <Field label="Flat, house or building" required><TextInput value={draft.addressLine1} onChange={(event) => update("addressLine1", event.target.value)} placeholder="House number and street" /></Field>
      <Field label="Area or landmark"><TextInput value={draft.addressLine2} onChange={(event) => update("addressLine2", event.target.value)} placeholder="Area, landmark" /></Field>
      <Field label="City / town" required><TextInput value={draft.city} onChange={(event) => update("city", event.target.value)} /></Field>
      <Field label="District"><TextInput value={draft.district} onChange={(event) => update("district", event.target.value)} /></Field>
      <Field label="State" required><TextInput value={draft.state} onChange={(event) => update("state", event.target.value)} /></Field>
      <Field label="PIN code" required><TextInput inputMode="numeric" maxLength={6} value={draft.pinCode} onChange={(event) => update("pinCode", event.target.value.replace(/\D/g, ""))} placeholder="6 digits" /></Field>
      <div className="span-2"><ToggleRow checked={draft.permanentSame} onChange={(value) => update("permanentSame", value)} title="My permanent address is the same" description="Confirm whether the address above is also your permanent address." /></div>
    </div>
  );

  if (current === "W08") return (
    <div className="form-grid">
      <div className="span-2 digilocker-card ovse-card">
        <div><span>Authorised Aadhaar verification</span><h3>Verify Aadhaar with Pehchaan</h3><p>{draft.aadhaarOvseVerified ? "Aadhaar identity was verified successfully." : draft.aadhaarOvseStatus === "callback_received" ? "Details received. Surepass is processing the verified credentials." : draft.aadhaarOvseStatus === "pending" ? "Waiting for you to complete verification in Pehchaan." : "Open the secure web-to-app journey on Android. Complete consent in Pehchaan, then return to this application."}</p></div>
        <button className="button button-secondary" type="button" onClick={props.startAadhaarOvse} disabled={props.busy || draft.aadhaarOvseVerified}>{props.busy ? "Opening…" : draft.aadhaarOvseVerified ? "Aadhaar verified ✓" : ["failed", "expired"].includes(draft.aadhaarOvseStatus || "") ? "Try Aadhaar again" : draft.aadhaarOvseClientId ? "Continue in Pehchaan" : "Verify Aadhaar"} <span>↗</span></button>
      </div>
      <div className="span-2 digilocker-card">
        <div><span>Trusted documents</span><h3>Connect DigiLocker</h3><p>Open the secure DigiLocker journey to share verified digital documents. You will return to this application afterward.</p></div>
        <button className="button button-secondary" type="button" onClick={props.startDigiLocker} disabled={props.busy}>{props.busy ? "Opening…" : "Open DigiLocker"} <span>↗</span></button>
      </div>
      <Field label="PAN number" hint="Used for PAN Comprehensive" required><TextInput maxLength={10} value={draft.panNumber} onChange={(event) => update("panNumber", event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} placeholder="ABCDE1234F" /></Field>
      <Field label="Voter ID / EPIC" hint="Optional"><TextInput value={draft.voterId} onChange={(event) => update("voterId", event.target.value.toUpperCase())} placeholder="Enter EPIC number" /></Field>
      <Field label="Passport file number" hint="Optional"><TextInput value={draft.passportFileNumber} onChange={(event) => update("passportFileNumber", event.target.value.toUpperCase())} placeholder="Passport file number" /></Field>
      <div />
      <UploadBox title="Upload identity card" subtitle="PAN, voter ID or passport image · JPG/PNG" accept="image/jpeg,image/png" fileName={files.idCard?.name} onChange={(file) => setFiles((old) => ({ ...old, idCard: file }))} />
      <UploadBox title="Upload e-Aadhaar PDF" subtitle="Optional · temporarily unavailable" accept="application/pdf" fileName={files.aadhaar?.name} onChange={(file) => setFiles((old) => ({ ...old, aadhaar: file }))} />
      <div className="span-2"><Notice tone="warning">e-Aadhaar is currently optional and may be unavailable during testing. Upload it only after giving explicit consent.</Notice></div>
    </div>
  );

  return <ScreenPartTwo {...props} />;
}

function ScreenPartTwo(props: ScreenProps) {
  const { current, draft, update, files, setFiles, application } = props;
  if (current === "W09") return (
    <div className="form-grid">
      {!props.requiresVehicle && <div className="span-2"><Notice>This section is optional for the selected package. Add details only if you want them included in the worker profile.</Notice></div>}
      <Field label="Driving licence number" required={props.requiresVehicle}><TextInput value={draft.drivingLicenceNumber} onChange={(event) => update("drivingLicenceNumber", event.target.value.toUpperCase())} placeholder="e.g. UP2020150000000" /></Field>
      <Field label="Licence holder date of birth" required={props.requiresVehicle}><TextInput type="date" value={draft.drivingLicenceDob} onChange={(event) => update("drivingLicenceDob", event.target.value)} /></Field>
      <Field label="Vehicle registration number" hint="RC V2 also returns available insurance, PUC and permit data" required={props.requiresVehicle}><TextInput value={draft.vehicleRegistration} onChange={(event) => update("vehicleRegistration", event.target.value.toUpperCase().replace(/\s/g, ""))} placeholder="CG04AB1234" /></Field>
      <Field label="Vehicle ownership"><SelectInput value={draft.ownershipType} onChange={(event) => update("ownershipType", event.target.value)}><option value="">Select</option><option value="self">Self-owned</option><option value="family">Family-owned</option><option value="leased">Leased / rented</option><option value="fleet">Fleet / platform vehicle</option></SelectInput></Field>
      <div className="span-2 info-strip"><span>Vehicle details</span><p>Your registration number is used to check ownership and available insurance, PUC and permit details together.</p></div>
    </div>
  );

  if (current === "W10") return (
    <div className="form-grid">
      <Field label="Current work status"><SelectInput value={draft.workStatus} onChange={(event) => update("workStatus", event.target.value)}><option value="">Select</option><option value="employed">Employed</option><option value="gig">Gig / platform worker</option><option value="self">Self-employed</option><option value="between">Between jobs</option></SelectInput></Field>
      <Field label="Current or recent employer"><TextInput value={draft.employerName} onChange={(event) => update("employerName", event.target.value)} placeholder="Company or platform name" /></Field>
      <Field label="UAN" hint="Optional · 12 digits for employment history"><TextInput inputMode="numeric" maxLength={12} value={draft.uan} onChange={(event) => update("uan", event.target.value.replace(/\D/g, ""))} placeholder="Universal Account Number" /></Field>
      <Field label="Platforms you work with" hint="Optional"><TextInput value={draft.currentPlatforms} onChange={(event) => update("currentPlatforms", event.target.value)} placeholder="e.g. delivery or mobility platforms" /></Field>
      <div className="span-2"><Notice tone="warning">Current employment and e-Aadhaar may be unavailable during testing. If a check cannot be completed, it will show Failed or Manual Review.</Notice></div>
    </div>
  );

  if (current === "W11") return (
    <div className="form-grid">
      <Field label="Highest qualification"><SelectInput value={draft.highestQualification} onChange={(event) => update("highestQualification", event.target.value)}><option value="">Select</option><option>Below 10th</option><option>10th pass</option><option>12th pass</option><option>Diploma / ITI</option><option>Graduate</option><option>Postgraduate</option></SelectInput></Field>
      <Field label="Institute / board"><TextInput value={draft.institute} onChange={(event) => update("institute", event.target.value)} placeholder="Optional" /></Field>
      <Field label="Skill certification"><TextInput value={draft.skillCertification} onChange={(event) => update("skillCertification", event.target.value)} placeholder="e.g. electrician, first aid" /></Field>
      <Field label="Certificate reference"><TextInput value={draft.certificateReference} onChange={(event) => update("certificateReference", event.target.value)} placeholder="Certificate or licence number" /></Field>
      <div className="span-2"><Notice>Education and skill documents are currently sent for manual review.</Notice></div>
    </div>
  );

  if (current === "W12") return (
    <div className="form-grid">
      {!props.requiresReference && <div className="span-2"><Notice>This package does not require a reference. You can skip this section.</Notice></div>}
      <Field label="Reference full name" required={props.requiresReference}><TextInput value={draft.referenceName} onChange={(event) => update("referenceName", event.target.value)} placeholder="Person who knows your work" /></Field>
      <Field label="Reference mobile number" required={props.requiresReference}><TextInput inputMode="numeric" maxLength={10} value={draft.referencePhone} onChange={(event) => update("referencePhone", event.target.value.replace(/\D/g, ""))} placeholder="10-digit number" /></Field>
      <Field label="Relationship"><SelectInput value={draft.referenceRelationship} onChange={(event) => update("referenceRelationship", event.target.value)}><option value="">Select</option><option value="manager">Former manager</option><option value="client">Client / customer</option><option value="colleague">Colleague</option><option value="personal">Personal reference</option></SelectInput></Field>
      <div className="reference-ethics"><span>✓</span><p><strong>Ask before adding someone</strong><br />Confirm the reference has agreed to be contacted for this verification.</p></div>
    </div>
  );

  if (current === "W13") return (
    <div className="capture-layout">
      <div className="capture-preview">{files.selfie ? <><span className="capture-success">✓</span><strong>{files.selfie.name}</strong><small>Ready for liveness and face match</small></> : <><div className="face-frame"><span>◉</span></div><strong>Clear, recent selfie</strong><small>Face the camera · remove helmet or mask · use even light</small></>}</div>
      <div className="capture-controls"><h3>Before you upload</h3><ul><li>Only the worker should appear</li><li>Use a plain, well-lit background</li><li>Keep eyes open and face fully visible</li></ul><UploadBox title="Take or choose a selfie" subtitle="JPG or PNG · up to 10 MB" accept="image/jpeg,image/png" capture="user" fileName={files.selfie?.name} onChange={(file) => setFiles((old) => ({ ...old, selfie: file }))} /><Notice tone="warning">For this test, upload a clear selfie. Live camera verification will be available in production.</Notice></div>
    </div>
  );

  if (current === "W14") return (
    <div className="review-layout">
      <section><div className="review-section-head"><h3>Worker details</h3><button type="button" onClick={() => props.goTo(5)}>Edit</button></div><div className="summary-grid"><SummaryItem label="Name" value={draft.fullName} /><SummaryItem label="Mobile" value={`+91 ${draft.phone}`} /><SummaryItem label="Date of birth" value={draft.dateOfBirth} /><SummaryItem label="Occupation" value={draft.occupations.join(", ")} /><SummaryItem label="Address" value={[draft.addressLine1, draft.city, draft.state, draft.pinCode].filter(Boolean).join(", ")} /><SummaryItem label="Package" value={props.selectedPackage.name} /></div></section>
      <section><div className="review-section-head"><h3>Checks and inputs</h3><button type="button" onClick={() => props.goTo(7)}>Edit</button></div><div className="review-checks"><span>✓ PAN: {draft.panNumber || "Missing"}</span><span>{draft.voterId ? "✓" : "–"} Voter ID</span><span>{draft.drivingLicenceNumber ? "✓" : "–"} Driving licence</span><span>{draft.vehicleRegistration ? "✓" : "–"} RC V2</span><span>{draft.uan ? "✓" : "–"} Employment</span><span>{draft.referenceName ? "✓" : "–"} Reference</span><span>{files.selfie ? "✓" : "–"} Selfie</span><span>{files.aadhaar ? "✓" : "–"} e-Aadhaar</span></div></section>
      <ToggleRow checked={draft.declaration} onChange={(value) => update("declaration", value)} title="I declare that these details and documents belong to me and are accurate" description="I understand that incorrect information can cause a failed check or manual review." required />
    </div>
  );

  if (current === "W15") return (
    <div className="payment-layout">
      <div className="invoice-card"><span>Selected package</span><h2>{props.selectedPackage.name}</h2><p>{props.selectedPackage.advertisedCheckCount || props.selectedPackage.checks.length} checks · validity determined per check</p><div><span>Verification fee</span><strong>₹{props.selectedPackage.priceInr ?? "—"}</strong></div><div><span>Payment status</span><strong>{props.paymentCoverage.covered ? `Covered by ${props.paymentCoverage.sponsor}` : "Payment pending"}</strong></div><hr /><div className="invoice-total"><span>Amount due from worker</span><strong>{props.paymentCoverage.covered ? "₹0" : `₹${props.selectedPackage.priceInr ?? "—"}`}</strong></div></div>
      <div className="payer-options">
        <h3>How will this be paid?</h3>
        {props.paymentCoverage.covered ? <div className="payment-covered"><span>✓</span><div><small>Payment code applied</small><strong>Verification fee covered</strong><p>{props.paymentCoverage.sponsor} will pay for this verification.</p></div><button onClick={props.removePaymentCode}>Remove</button></div> : <>
          {(["employer", "worker"] as const).map((payer) => <button key={payer} className={draft.payer === payer ? "selected" : ""} onClick={() => update("payer", payer)}><span className="radio-dot" /><span><strong>{payer === "employer" ? "Employer / platform will pay" : "I will pay"}</strong><small>{payer === "employer" ? "Apply a company payment code below" : "Payment gateway required in production"}</small></span></button>)}
          <div className="payment-code-card"><span>Company payment code</span><h4>Have a code from your employer?</h4><p>Enter it here. A valid code covers this verification fee.</p><div><TextInput value={props.paymentCode} onChange={(event) => props.setPaymentCode(event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))} placeholder="Enter payment code" /><button className="button button-secondary" onClick={props.applyPaymentCode} disabled={props.busy || props.paymentCode.length < 4}>Apply code</button></div>{props.paymentCoverage.message && <small className="code-error">{props.paymentCoverage.message}</small>}</div>
          <Notice tone="warning">Card/UPI collection is not connected yet. A valid company code can cover the fee in this MVP.</Notice>
        </>}
        {props.requiresCourt && <div className="required-uploads"><span>Required for court-record check</span><h4>Worker family and address details</h4><p>These details help narrow the court-record search to the correct person.</p><Field label="Father or guardian name" required><TextInput value={draft.fatherName} onChange={(event) => update("fatherName", event.target.value)} placeholder="Enter full name" /></Field><div className="review-checks"><span>{draft.addressLine1 && draft.city && draft.state && /^\d{6}$/.test(draft.pinCode) ? "✓" : "–"} Submitted address: {[draft.addressLine1, draft.city, draft.state, draft.pinCode].filter(Boolean).join(", ") || "Missing"}</span></div><button className="button button-secondary" type="button" onClick={() => props.goTo(6)}>Review address</button></div>}
        {(!files.idCard || !files.selfie) && <div className="required-uploads"><span>Required before submission</span><h4>Complete face-verification files</h4><p>Uploaded files cannot be restored after a browser refresh. Add the missing file again here.</p><div>{!files.idCard && <UploadBox title="Upload identity card" subtitle="PAN, voter ID or passport image · JPG/PNG" accept="image/jpeg,image/png" onChange={(file) => setFiles((old) => ({ ...old, idCard: file }))} />}{!files.selfie && <UploadBox title="Upload worker selfie" subtitle="Clear recent selfie · JPG/PNG" accept="image/jpeg,image/png" onChange={(file) => setFiles((old) => ({ ...old, selfie: file }))} />}</div></div>}
      </div>
    </div>
  );

  if (current === "W16") return (
    <div className="tracker-layout">
      {!draft.applicationId ? <EmptyState icon="◷" title="No active case" description="Complete the application to create a verification case." /> : <>
        <div className="case-head"><div><span>Application ID</span><strong>{draft.applicationId}</strong></div><button className="copy-id" type="button" aria-label="Copy application ID" onClick={() => navigator.clipboard.writeText(draft.applicationId || "")}>Copy</button><StatusPill status={application?.status || "QUEUED"} /></div>
        {props.uploadStatus && <div className="secure-storage-status"><span>🔒</span><div><strong>{props.uploadStatus}</strong><small>{props.secureDocuments.length} document{props.secureDocuments.length === 1 ? "" : "s"} stored with private access and KMS encryption.</small></div></div>}
        <div className="tracker-count"><strong>{completedCheckCount(application)} of {application?.verifications?.length || 0} checks complete</strong><button type="button" onClick={props.refreshApplication}>Refresh</button></div>
        <div className="tracker-progress" aria-hidden="true"><span style={{ width: `${progressPercent(application)}%` }} /></div>
        <div className="checkpoint-list" aria-live="polite">{application?.verifications?.length ? sortedChecks(application).map((check) => <article key={check.id}><span className={`checkpoint checkpoint-${check.status.toLowerCase().replaceAll("_", "-")}`}>{check.status === "VERIFIED" ? "✓" : check.status === "FAILED" ? "!" : check.status === "MANUAL_REVIEW" ? "◐" : check.status === "PROCESSING" ? "↻" : "·"}</span><div><strong>{prettyCheck(check.type)}</strong><small>{check.status === "VERIFIED" ? "Verified" : check.status === "PROCESSING" ? "Checking now" : `Attempt ${check.attemptCount}`}</small>{check.failureReason && <p>{check.failureReason}</p>}{check.status === "FAILED" && <button className="inline-retry" type="button" onClick={() => props.retry(check.id)} disabled={props.busy}>Fix and retry</button>}</div><StatusPill status={check.status} /></article>) : <div className="loading-row"><span className="spinner" /> Waiting for verification checks…</div>}</div>
        {application?.card ? <VerificationCardView application={application} workerName={draft.fullName} /> : <div className={`final-decision final-${(application?.recommendation || "PENDING").toLowerCase().replaceAll("_", "-")}`}><span>Final result</span><strong>{application?.recommendation === "FAIL" ? "Not verified" : application?.recommendation === "MANUAL_REVIEW" ? "Manual review required" : "Verification in progress"}</strong><p>{application?.recommendation === "FAIL" ? "One or more checks could not be verified." : application?.recommendation === "MANUAL_REVIEW" ? "An authorised reviewer must complete the remaining checkpoints before a card can be issued." : "Your LIWIP card will be generated automatically after every required check passes."}</p></div>}
        {!application?.card && <button className="button button-secondary" onClick={() => props.goTo(16)}>Review issues <span>→</span></button>}
      </>}
    </div>
  );

  return <ScreenPartThree {...props} />;
}

function VerificationCardView({ application, workerName }: { application: ApplicationResult; workerName: string }) {
  const card = application.card!;
  return (
    <section className="liwip-card-wrap">
      <div className="issued-card-art">
        <div className="card-photo-crop">
          <Image className="card-photo-source" src="/liwip-gig-card.png" alt="LIWIP Gig Card artwork" width={1798} height={1376} sizes="(max-width: 800px) 100vw, 52vw" />
        </div>
      </div>
      <div className="card-issued-copy"><span>Final result · Pass</span><h3>Your verified worker card is ready</h3><p><strong>{workerName}</strong><br />{application.package?.name || "Worker verification"}</p><dl><div><dt>Card number</dt><dd>{card.cardNumber}</dd></div><div><dt>Valid until</dt><dd>{new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(card.expiresAt))}</dd></div></dl></div>
    </section>
  );
}

function progressPercent(application: ApplicationResult | null) {
  const checks = application?.verifications || [];
  if (!checks.length) return 4;
  const done = checks.filter((item) => ["VERIFIED", "FAILED", "MANUAL_REVIEW"].includes(item.status)).length;
  return Math.round((done / checks.length) * 100);
}

function completedCheckCount(application: ApplicationResult | null) {
  return application?.verifications?.filter((item) => ["VERIFIED", "FAILED", "MANUAL_REVIEW"].includes(item.status)).length || 0;
}

function sortedChecks(application: ApplicationResult): VerificationResult[] {
  const rank: Record<VerificationResult["status"], number> = {
    FAILED: 0,
    MANUAL_REVIEW: 1,
    PROCESSING: 2,
    QUEUED: 3,
    PENDING: 4,
    VERIFIED: 5
  };
  return [...application.verifications].sort((a, b) => rank[a.status] - rank[b.status]);
}

function ScreenPartThree(props: ScreenProps) {
  const { application } = props;
  const issues = application?.verifications?.filter((item) => ["FAILED", "MANUAL_REVIEW"].includes(item.status)) || [];

  return (
    <div className="issue-stack">
      {!application ? <EmptyState icon="!" title="No case loaded" description="Submit a case and return here to resolve verification issues." /> : issues.length === 0 ? <Notice tone="success"><strong>No worker action is required.</strong><br />Checks are either progressing or have completed successfully.</Notice> : issues.map((check) => <article className="issue-card" key={check.id}><div><StatusPill status={check.status} /><h3>{prettyCheck(check.type)}</h3><p>{check.failureReason || "This check could not be completed with the supplied information."}</p><small>Check the worker details before retrying. If the information is correct, request manual review.</small></div><button className="button button-secondary" onClick={() => props.retry(check.id)} disabled={props.busy}>Retry check</button></article>)}
      <div className="support-banner"><span>?</span><div><strong>Information is correct but the check still fails?</strong><p>Raise a support ticket with the application ID and check name. Never include full Aadhaar or passwords in chat.</p></div></div>
    </div>
  );
}
