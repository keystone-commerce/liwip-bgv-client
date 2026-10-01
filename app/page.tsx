import type { Metadata } from "next";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

export const metadata: Metadata = {
  title: "LIWIP | Get verified"
};

export default function HomePage() {
  return <OnboardingFlow />;
}
