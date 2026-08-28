import type { FlowStep } from "./types";

export const FLOW_STEPS: FlowStep[] = [
  { code: "W01", label: "Mobile OTP", section: "Access", eyebrow: "Secure access", title: "One number, one identity", description: "Verify the mobile number that will identify this worker account." },
  { code: "W02", label: "Home", section: "Access", eyebrow: "Worker home", title: "Everything in one place", description: "See the active case, required actions and reusable verification profile." },
  { code: "W05", label: "Choose your work", section: "Setup", eyebrow: "Choose your work", title: "What kind of work do you do?", description: "Your work decides which checks and package you need." },
  { code: "W03", label: "Review package", section: "Setup", eyebrow: "Your package", title: "Checks that match your work", description: "See exactly what is checked and what the verification costs." },
  { code: "W04", label: "Consent & privacy", section: "Setup", eyebrow: "Your permissions", title: "You control every permission", description: "Approve each required check separately before sharing personal information." },
  { code: "W06", label: "Personal details", section: "Profile", eyebrow: "About you", title: "Personal details", description: "Enter the details that should match your trusted identity documents." },
  { code: "W07", label: "Address", section: "Profile", eyebrow: "Where you live", title: "Current and permanent address", description: "Provide a complete current address and confirm whether it is permanent." },
  { code: "W08", label: "Identity documents", section: "Profile", eyebrow: "Trusted identity", title: "Identity documents", description: "Add your identifiers and a clear image of your identity document." },
  { code: "W09", label: "Driving & vehicle", section: "Profile", eyebrow: "Role credentials", title: "Licence and vehicle", description: "Driver and rider packages use these details for DL and RC V2 checks." },
  { code: "W10", label: "Employment", section: "Profile", eyebrow: "Work history", title: "Employment and platform history", description: "PAN, mobile or UAN can be used for the current-employment check." },
  { code: "W11", label: "Education & skills", section: "Profile", eyebrow: "Experience", title: "Qualifications and skills", description: "Add optional qualifications or role-specific certifications." },
  { code: "W12", label: "References", section: "Profile", eyebrow: "People who know your work", title: "References, only when needed", description: "A package may require one personal or professional reference." },
  { code: "W13", label: "Selfie & liveness", section: "Verification", eyebrow: "Biometric check", title: "Presence, then match", description: "Upload a recent selfie for liveness and face matching." },
  { code: "W14", label: "Review & declaration", section: "Verification", eyebrow: "Confirm details", title: "Review before submission", description: "Check every detail and make the worker declaration before creating the case." },
  { code: "W15", label: "Payment", section: "Verification", eyebrow: "Package payment", title: "Worker-paid, employer-paid or waived", description: "The selected payer and package amount are recorded before submission." },
  { code: "W16", label: "Case tracker", section: "Outcome", eyebrow: "Live case", title: "Check-level progress", description: "Follow every verification check through its live status." },
  { code: "W17", label: "Resolve an issue", section: "Outcome", eyebrow: "Action required", title: "Fix one thing, not everything", description: "Review failed checks, correct the information and retry when allowed." }
];

export const STEP_INDEX = Object.fromEntries(FLOW_STEPS.map((step, index) => [step.code, index]));

export const PACKAGE_OCCUPATION: Record<string, string> = {
  delivery: "RIDER",
  driver: "DRIVER",
  home: "HOME_SERVICES",
  security: "SECURITY",
  warehouse: "FACTORY_WAREHOUSE",
  temporary: "BASIC_ID"
};
