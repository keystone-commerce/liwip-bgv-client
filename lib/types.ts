export type StepCode = `W${string}`;

export interface FlowStep {
  code: StepCode;
  label: string;
  section: "Access" | "Setup" | "Profile" | "Verification" | "Outcome";
  eyebrow: string;
  title: string;
  description: string;
}

export interface PackageCheck {
  type: string;
  mode: "REQUIRED" | "OPTIONAL";
  execution?: "PROVIDER" | "MANUAL";
}

export interface VerificationPackage {
  id: string;
  code: string;
  version: number;
  name: string;
  description?: string;
  priceInr?: number;
  advertisedCheckCount?: number;
  targetWorkforce?: string;
  checks: PackageCheck[];
}

export interface VerificationResult {
  id: string;
  type: string;
  status: "PENDING" | "QUEUED" | "PROCESSING" | "VERIFIED" | "FAILED" | "MANUAL_REVIEW";
  provider: string;
  attemptCount: number;
  failureReason?: string;
  result?: Record<string, unknown>;
}

export interface ApplicationResult {
  id: string;
  status: string;
  recommendation?: "PENDING" | "PASS" | "FAIL" | "MANUAL_REVIEW";
  package?: { name: string; priceInr?: number; version: number };
  card?: VerificationCard;
  verifications: VerificationResult[];
  createdAt?: string;
  updatedAt?: string;
}

export interface VerificationCard {
  id: string;
  applicationId: string;
  cardNumber: string;
  publicId: string;
  status: "ACTIVE" | "SUSPENDED" | "EXPIRED";
  issuedAt: string;
  expiresAt: string;
}

export interface SecureDocument {
  id: string;
  application_id: string;
  document_type: string;
  file_name: string;
  content_type: string;
  size_bytes?: number | null;
  status: "PENDING_UPLOAD" | "UPLOADED" | "DELETED";
  uploaded_at?: string | null;
}

export interface WorkerDraft {
  phone: string;
  otpVerified: boolean;
  packageCode: string;
  occupations: string[];
  fullName: string;
  dateOfBirth: string;
  gender: string;
  email: string;
  preferredLanguage: string;
  alternatePhone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  district: string;
  state: string;
  pinCode: string;
  permanentSame: boolean;
  panNumber: string;
  voterId: string;
  passportFileNumber: string;
  drivingLicenceNumber: string;
  drivingLicenceDob: string;
  vehicleRegistration: string;
  ownershipType: string;
  uan: string;
  employerName: string;
  workStatus: string;
  currentPlatforms: string;
  highestQualification: string;
  institute: string;
  skillCertification: string;
  certificateReference: string;
  referenceName: string;
  referencePhone: string;
  referenceRelationship: string;
  fatherName: string;
  criminalState: string;
  coreConsent: boolean;
  identityConsent: boolean;
  biometricConsent: boolean;
  addressConsent: boolean;
  criminalConsent: boolean;
  declaration: boolean;
  payer: "worker" | "employer" | "waived";
  aadhaarOvseClientId?: string;
  aadhaarOvseStatus?: "pending" | "callback_received" | "completed" | "failed" | "expired";
  aadhaarOvseVerified?: boolean;
  applicationId?: string;
}
