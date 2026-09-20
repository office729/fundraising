"use client";

import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";

import { anuleazaFetch, citesteSnapshot, handeazaFetch, injecteazaShim, persistaStocare, type FetchMsg } from "./sandbox-bridge";

// Iframe SANDBOXED (origine opacă) pentru instrumentele HTML — vezi sandbox-bridge.ts.
// Snapshotul datelor din browser se citește o singură dată la montare și rămâne înghețat
// cât timp pagina e deschisă (altfel fiecare scriere ar schimba srcDoc și ar reîncărca iframe-ul).
const SNAPSHOTURI = new Map<string, string>();
const fara = () => () => {};

export function SandboxedFrame({ html, title, orgSlug }: { html: string; title: string; orgSlug: string }) {
  const cheie = `${orgSlug}|${title}`;
  const snap = useSyncExternalStore(
    fara,
    () => {
      let v = SNAPSHOTURI.get(cheie);
      if (v == null) {
        v = JSON.stringify(citesteSnapshot(window.localStorage));
        SNAPSHOTURI.set(cheie, v);
      }
      return v;
    },
    () => null,
  );
  useEffect(() => () => void SNAPSHOTURI.delete(cheie), [cheie]);

  const ref = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const frame = ref.current?.contentWindow;
      const m = e.data as { fa?: number; t?: string } | null;
      if (!frame || e.source !== frame || !m || m.fa !== 1 || typeof m.t !== "string") return;
      if (m.t.startsWith("ls-")) {
        persistaStocare(m as { t: string; k?: string; v?: string }, window.localStorage);
      } else if (m.t === "fetch") {
        handeazaFetch(m as unknown as FetchMsg, orgSlug, window.location.origin).then((r) => frame.postMessage(r, "*"));
      } else if (m.t === "fetch-abort") {
        anuleazaFetch((m as unknown as { id: number }).id);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [orgSlug]);

  const srcDoc = useMemo(() => {
    if (snap == null) return undefined;
    const l = window.location;
    return injecteazaShim(html, {
      snap: JSON.parse(snap) as Record<string, string>,
      host: { origin: l.origin, pathname: l.pathname, search: l.search, href: l.href },
    });
  }, [snap, html]);

  if (srcDoc == null) return <div className="h-full" aria-busy="true" />;

  return (
    <iframe
      ref={ref}
      srcDoc={srcDoc}
      title={title}
      sandbox="allow-scripts allow-forms allow-modals allow-downloads allow-popups allow-popups-to-escape-sandbox"
      allow="clipboard-read; clipboard-write"
      className="h-full w-full border-0"
    />
  );
}
