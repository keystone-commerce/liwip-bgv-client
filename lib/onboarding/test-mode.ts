// Test mode lets reviewers tap through every onboarding screen without typing.
// Blocked buttons stay enabled and missing answers fall back to demo values.
// On by default in development; in production only when the env flag is "true".
const flag = process.env.NEXT_PUBLIC_ONBOARDING_TEST_MODE;

export const ONBOARDING_TEST_MODE = flag === "true" || (flag !== "false" && process.env.NODE_ENV === "development");

export const TEST_PHONE = "9876543210";
export const TEST_OTP = "123456";
