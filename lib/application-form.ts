import type { WorkerDraft } from "./types";

export interface WorkerFiles {
  aadhaar?: File;
  selfie?: File;
  idCard?: File;
}

export function buildApplicationForm(draft: WorkerDraft, files: WorkerFiles, requiresCourt: boolean) {
  const form = new FormData();
  const submittedAddress = [
    draft.addressLine1,
    draft.addressLine2,
    draft.city,
    draft.district,
    draft.state,
    draft.pinCode
  ].filter(Boolean).join(", ");

  const values: Record<string, string> = {
    package_code: draft.packageCode,
    name: draft.fullName,
    dob: draft.dateOfBirth,
    pan: draft.panNumber,
    driving_license: draft.drivingLicenceNumber,
    driving_license_dob: draft.drivingLicenceDob,
    voter_id: draft.voterId,
    passport_file_number: draft.passportFileNumber,
    father_name: draft.fatherName,
    uan: draft.uan,
    employer_name: draft.employerName,
    reference_name: draft.referenceName,
    reference_phone: draft.referencePhone,
    reference_relationship: draft.referenceRelationship,
    skill_certification: draft.skillCertification,
    certificate_reference: draft.certificateReference,
    criminal_year: requiresCourt ? draft.dateOfBirth.slice(0, 4) : "",
    criminal_state: requiresCourt ? (draft.criminalState || draft.state) : "",
    gender: draft.gender,
    vehicle_registration_number: draft.vehicleRegistration,
    submitted_address: submittedAddress,
    consent: draft.identityConsent ? "Y" : "N",
    address_consent: draft.addressConsent ? "Y" : "N",
    biometric_consent: draft.biometricConsent ? "Y" : "N",
    criminal_consent: requiresCourt && draft.criminalConsent ? "Y" : "N"
  };

  Object.entries(values).forEach(([key, value]) => {
    if (value) form.set(key, value);
  });

  if (files.aadhaar) form.set("aadhaar_file", files.aadhaar);
  if (files.selfie) form.set("selfie", files.selfie);
  if (files.idCard) form.set("id_card", files.idCard);
  return form;
}
