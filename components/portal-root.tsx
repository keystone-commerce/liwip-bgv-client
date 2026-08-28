"use client";

import { useEffect, useState } from "react";
import { WorkerPortal } from "./worker-portal";
import { OrganisationNotice } from "./portal/organisation-notice";
import { RoleSplitHome } from "./portal/role-split-home";
import { FALLBACK_PACKAGES } from "@/lib/worker-config";
import type { VerificationPackage } from "@/lib/types";

type PortalRole = "worker" | "organisation" | null;

export function PortalRoot() {
  const [role, setRole] = useState<PortalRole>(null);
  const [packages, setPackages] = useState<VerificationPackage[]>(FALLBACK_PACKAGES);
  const [backendReady, setBackendReady] = useState<boolean | null>(null);
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    const queryRole = new URLSearchParams(window.location.search).get("as");
    const storedRole = sessionStorage.getItem("liwip-portal-role");
    const nextRole: PortalRole = queryRole === "worker" || storedRole === "worker"
      ? "worker"
      : queryRole === "organisation" || storedRole === "organisation"
        ? "organisation"
        : null;
    queueMicrotask(() => {
      setRole(nextRole);
      setHasDraft(Boolean(sessionStorage.getItem("liwip-worker-draft")));
    });

    fetch("/api/packages")
      .then(async (response) => {
        if (!response.ok) throw new Error("Package service unavailable");
        const data = await response.json();
        const list = Array.isArray(data) ? data : data.packages;
        if (!Array.isArray(list) || !list.length) throw new Error("No packages returned");
        setPackages(list);
        setBackendReady(true);
      })
      .catch(() => setBackendReady(false));
  }, []);

  function choose(nextRole: Exclude<PortalRole, null>) {
    sessionStorage.setItem("liwip-portal-role", nextRole);
    setRole(nextRole);
    const url = new URL(window.location.href);
    url.searchParams.set("as", nextRole === "organisation" ? "organisation" : "worker");
    window.history.pushState({ role: nextRole }, "", `${url.pathname}${url.search}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goHome() {
    sessionStorage.removeItem("liwip-portal-role");
    setRole(null);
    window.history.pushState({}, "", window.location.pathname);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (role === "worker") return <WorkerPortal onHome={goHome} />;
  if (role === "organisation") return <OrganisationNotice onBack={goHome} onWorker={() => choose("worker")} />;

  return (
    <RoleSplitHome
      packages={packages}
      backendReady={backendReady}
      hasDraft={hasDraft}
      onWorker={() => choose("worker")}
      onOrganisation={() => choose("organisation")}
    />
  );
}
