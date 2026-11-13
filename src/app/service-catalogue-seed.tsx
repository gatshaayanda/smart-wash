"use client";

import { useEffect } from "react";

export default function ServiceCatalogueSeed() {
  useEffect(() => {
    if (!navigator.onLine) return;
    void fetch("/api/catalogue/seed", { method: "POST", cache: "no-store" }).catch(() => {
      // The live catalogue subscription remains authoritative and retries on the next visit.
    });
  }, []);
  return null;
}
