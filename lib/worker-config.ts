import type { VerificationPackage, WorkerDraft } from "./types";

export const EMPTY_DRAFT: WorkerDraft = {
  phone: "",
  otpVerified: false,
  packageCode: "BASIC_ID",
  occupations: [],
  fullName: "",
  dateOfBirth: "",
  gender: "",
  email: "",
  preferredLanguage: "English",
  alternatePhone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  district: "",
  state: "",
  pinCode: "",
  permanentSame: true,
  panNumber: "",
  voterId: "",
  passportFileNumber: "",
  drivingLicenceNumber: "",
  drivingLicenceDob: "",
  vehicleRegistration: "",
  ownershipType: "",
  uan: "",
  employerName: "",
  workStatus: "",
  currentPlatforms: "",
  highestQualification: "",
  institute: "",
  skillCertification: "",
  certificateReference: "",
  referenceName: "",
  referencePhone: "",
  referenceRelationship: "",
  fatherName: "",
  criminalState: "",
  coreConsent: false,
  identityConsent: false,
  biometricConsent: false,
  addressConsent: false,
  criminalConsent: false,
  declaration: false,
  payer: "worker"
};

export const OCCUPATIONS = [
  { id: "delivery", icon: "◒", title: "Delivery rider", detail: "Food, grocery and parcel delivery" },
  { id: "driver", icon: "◆", title: "Cab / auto driver", detail: "Passenger and commercial driving" },
  { id: "home", icon: "⌂", title: "Home services", detail: "Cleaning, repair and care services" },
  { id: "security", icon: "◈", title: "Security staff", detail: "Guarding and access control" },
  { id: "warehouse", icon: "▦", title: "Factory / warehouse", detail: "Operations and material handling" },
  { id: "temporary", icon: "◇", title: "Temporary worker", detail: "Short-term, low-risk work" }
] as const;

export const FALLBACK_PACKAGES: VerificationPackage[] = [
  { id: "basic", code: "BASIC_ID", version: 1, name: "Basic ID", priceInr: 199, advertisedCheckCount: 3, targetWorkforce: "Low-risk temporary workforce", checks: [] },
  { id: "rider", code: "RIDER", version: 1, name: "Rider", priceInr: 449, advertisedCheckCount: 8, targetWorkforce: "Delivery and bike logistics", checks: [] },
  { id: "driver", code: "DRIVER", version: 1, name: "Driver", priceInr: 549, advertisedCheckCount: 9, targetWorkforce: "Auto, taxi and cab", checks: [] },
  { id: "home", code: "HOME_SERVICES", version: 1, name: "Home Services", priceInr: 499, advertisedCheckCount: 7, targetWorkforce: "Customer-home access", checks: [] },
  { id: "security", code: "SECURITY", version: 1, name: "Security", priceInr: 599, advertisedCheckCount: 8, targetWorkforce: "PSARA-linked staffing", checks: [] },
  { id: "factory", code: "FACTORY_WAREHOUSE", version: 1, name: "Factory / Warehouse", priceInr: 399, advertisedCheckCount: 6, targetWorkforce: "Operations workforce", checks: [] }
];

export function messageFrom(value: unknown, fallback: string) {
  if (value && typeof value === "object" && "message" in value && typeof value.message === "string") return value.message;
  return fallback;
}

export function prettyCheck(type: string) {
  return type.toLowerCase().split("_").map((word) => word[0]?.toUpperCase() + word.slice(1)).join(" ");
}
