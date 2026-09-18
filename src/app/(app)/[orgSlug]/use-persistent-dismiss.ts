"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

// Same-tab writes don't fire the browser "storage" event (only OTHER tabs get
// notified) — but useSyncExternalStore still needs a subscribe function, so
// we give it a no-op-ish listener for cross-tab sync and combine its snapshot
// with a local `justDismissed` flag for the immediate same-tab hide.
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

// Persistă un dismiss "nu mai arăta asta" în localStorage (per browser, NU în
// DB) — pentru bannere/modaluri de onboarding necritice unde reapariția la
// FIECARE încărcare de pagină (refresh, link nou, navigare hard) e resimțită
// ca deranjantă. `getServerSnapshot` e mereu `true` (ascuns) ca randarea de
// pe server și primul paint client să coincidă — useSyncExternalStore
// reconciliază singur diferența față de valoarea reală din localStorage
// imediat după hidratare, fără setState manual într-un efect.
export function usePersistentDismiss(storageKey: string) {
  const [justDismissed, setJustDismissed] = useState(false);

  const getSnapshot = useCallback(() => {
    try {
      return window.localStorage.getItem(storageKey) != null;
    } catch {
      return false;
    }
  }, [storageKey]);
  const getServerSnapshot = useCallback(() => true, []);

  const dismissedInStorage = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function dismiss() {
    setJustDismissed(true);
    try {
      window.localStorage.setItem(storageKey, String(Date.now()));
    } catch {
      // localStorage indisponibil (mod privat etc.) — dismiss-ul ține doar
      // pentru randarea curentă, ca înainte de introducerea persistenței.
    }
  }

  return { dismissed: dismissedInStorage || justDismissed, dismiss };
}
