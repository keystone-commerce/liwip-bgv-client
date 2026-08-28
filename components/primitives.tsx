"use client";

import { useEffect, useState } from "react";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import Image from "next/image";
import type { FlowStep } from "@/lib/types";

export function Brand() {
  return (
    <div className="brand" aria-label="LIWIP home">
      <Image className="brand-logo" src="/liwip-logo.svg" alt="" width={32} height={32} aria-hidden="true" />
      <strong>LIWIP</strong>
    </div>
  );
}

export function Field({ label, hint, required, error, id, children }: { label: string; hint?: string; required?: boolean; error?: string; id?: string; children: ReactNode }) {
  return (
    <label className={`field ${error ? "field-error" : ""}`} htmlFor={id}>
      <span className="field-label">{label}{required && <b aria-hidden="true"> *</b>}</span>
      {hint && <span className="field-hint">{hint}</span>}
      {children}
      {error && <span className="field-error-message" id={id ? `${id}-error` : undefined}><b aria-hidden="true">!</b> {error}</span>}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return <input className={`input ${className || ""}`} {...rest} />;
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, ...rest } = props;
  return <select className={`input select ${className || ""}`} {...rest} />;
}

export function UploadBox({ title, subtitle, accept, capture, onChange, fileName }: { title: string; subtitle: string; accept?: string; capture?: "user" | "environment"; fileName?: string; onChange: (file?: File) => void }) {
  const [preview, setPreview] = useState<string>();
  const [error, setError] = useState("");

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  function choose(file?: File) {
    setError("");
    if (!file) return onChange(undefined);
    if (file.size > 10 * 1024 * 1024) {
      setError("Choose a file smaller than 10 MB.");
      return onChange(undefined);
    }
    if (preview) URL.revokeObjectURL(preview);
    setPreview(file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined);
    onChange(file);
  }

  return (
    <div className="upload-field">
      <label className={`upload-box ${fileName ? "is-filled" : ""}`}>
        <input type="file" accept={accept} capture={capture} onChange={(event) => choose(event.target.files?.[0])} />
        {preview ? <Image className="upload-preview" src={preview} alt="Selected document preview" width={80} height={80} unoptimized /> : <span className="upload-icon" aria-hidden="true">↥</span>}
        <span><strong>{fileName || title}</strong><small>{fileName ? "Selected. Tap to replace" : subtitle}</small></span>
      </label>
      {error && <span className="field-error-message"><b aria-hidden="true">!</b> {error}</span>}
    </div>
  );
}

export function ToggleRow({ checked, onChange, title, description, required }: { checked: boolean; onChange: (checked: boolean) => void; title: string; description?: string; required?: boolean }) {
  return (
    <label className="toggle-row">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="checkmark">✓</span>
      <span><strong>{title}{required && <em>Required</em>}</strong>{description && <small>{description}</small>}</span>
    </label>
  );
}

export function StatusPill({ status }: { status: string }) {
  const labels: Record<string, string> = {
    PENDING: "Waiting",
    QUEUED: "In queue",
    PROCESSING: "Checking now",
    VERIFIED: "Verified",
    FAILED: "Needs fix",
    MANUAL_REVIEW: "Under review"
  };
  return <span className={`status status-${status.toLowerCase().replaceAll("_", "-")}`}>{labels[status] || status.replaceAll("_", " ")}</span>;
}

export function Notice({ tone = "info", children }: { tone?: "info" | "success" | "warning" | "danger"; children: ReactNode }) {
  return <div className={`notice notice-${tone}`}>{children}</div>;
}

export function SummaryItem({ label, value }: { label: string; value?: ReactNode }) {
  return <div className="summary-item"><span>{label}</span><strong>{value || "Not provided"}</strong></div>;
}

export function EmptyState({ icon = "◇", title, description }: { icon?: string; title: string; description: string }) {
  return <div className="empty-state"><span>{icon}</span><h3>{title}</h3><p>{description}</p></div>;
}

const CHAPTER_LABELS: Record<string, string> = {
  Access: "Sign in",
  Setup: "Your work",
  Profile: "Your details",
  Verification: "Confirm & pay",
  Outcome: "Your result"
};

export function ChapterProgress({ steps, currentIndex, onGoTo }: { steps: FlowStep[]; currentIndex: number; onGoTo: (index: number) => void }) {
  const sections = ["Access", "Setup", "Profile", "Verification", "Outcome"];
  const current = steps[currentIndex];
  const currentSectionIndex = sections.indexOf(current.section);
  const chapterSteps = steps.map((step, index) => ({ step, index })).filter((item) => item.step.section === current.section);
  const position = chapterSteps.findIndex((item) => item.index === currentIndex) + 1;

  return (
    <div className="chapter-progress">
      <div className="chapter-mobile" aria-live="polite">
        <div className="chapter-segments" aria-hidden="true">
          {sections.map((section, index) => <i key={section} className={index < currentSectionIndex ? "done" : index === currentSectionIndex ? "current" : ""} />)}
        </div>
        <div className="chapter-current"><strong>{CHAPTER_LABELS[current.section]}</strong><span>{position} of {chapterSteps.length}</span></div>
      </div>
      <nav className="chapter-rail" aria-label="Application chapters">
        {sections.map((section, sectionIndex) => {
          const items = steps.map((step, index) => ({ step, index })).filter((item) => item.step.section === section);
          const isCurrent = section === current.section;
          const completed = sectionIndex < currentSectionIndex;
          return (
            <div className={`chapter-item ${isCurrent ? "is-current" : ""} ${completed ? "is-complete" : ""}`} key={section}>
              <div><span aria-hidden="true">{completed ? "✓" : sectionIndex + 1}</span><strong>{CHAPTER_LABELS[section]}</strong><small>{items.length} steps</small></div>
              {isCurrent && <div className="chapter-step-list">{items.map(({ step, index }) => <button type="button" key={step.code} className={index === currentIndex ? "active" : index < currentIndex ? "complete" : ""} onClick={() => index <= currentIndex && onGoTo(index)} disabled={index > currentIndex}><span aria-hidden="true">{index < currentIndex ? "✓" : "•"}</span>{step.label}</button>)}</div>}
            </div>
          );
        })}
      </nav>
    </div>
  );
}
