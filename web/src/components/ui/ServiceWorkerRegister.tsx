"use client";

import { useEffect } from "react";

// Enregistré uniquement en production — en dev, un SW actif casse le hot-reload
// et sert des versions périmées du code pendant qu'on itère.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return null;
}
