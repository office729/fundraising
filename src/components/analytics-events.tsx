"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { trackEvent, trimitePaginaContext } from "@/lib/analytics";
import { esteSlugRezervat } from "@/lib/reserved-slugs";

// Cookie scurt setat de server (lib/analytics-server.ts) când o acțiune se
// termină cu redirect (ex. crearea contului) — clientul nu are alt mod să afle
// că acțiunea a reușit. E citit și șters imediat, indiferent de acordul pentru
// analiză; evenimentul se trimite doar dacă vizitatorul a acceptat statisticile.
const EVT_COOKIE = "fa_evt";

function citesteSiStergeSemnal(): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${EVT_COOKIE}=([^;]*)`));
  if (!m) return null;
  document.cookie = `${EVT_COOKIE}=; Max-Age=0; path=/`;
  return decodeURIComponent(m[1]);
}

// Prima secțiune a căii decide: dacă e un slug rezervat (ruta statică — vezi
// lib/reserved-slugs.ts), pagina e publică (marketing/autentificare); altfel,
// primul segment e slug-ul unei organizații și pagina e din dashboard-ul ei.
// Exact aceeași regulă pe care proxy.ts o folosește pentru rescrierea
// domeniilor proprii — o singură sursă de adevăr pentru „ce e o pagină de org".
function grupDeContinut(pathname: string): { group: "public" | "dashboard"; orgSlug?: string } {
  const prim = pathname.split("/")[1] ?? "";
  if (!prim || esteSlugRezervat(prim)) return { group: "public" };
  return { group: "dashboard", orgSlug: prim };
}

export function AnalyticsEvents() {
  const pathname = usePathname();

  // Click pe un CTA către /signup (butoanele „Începe trial gratuit", alegerea
  // unui pachet din pagina de prețuri etc.). Delegare pe document, ca să nu
  // trebuiască editat fiecare buton în parte. Link-urile de invitație
  // (?invite= / ?beneficiarInvite=) nu sunt CTA de trial și se ignoră.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      let url: URL;
      try {
        url = new URL(a.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin || url.pathname !== "/signup") return;
      if (url.searchParams.has("invite") || url.searchParams.has("beneficiarInvite")) return;

      trackEvent("cta_trial_click", {
        link_text: (a.textContent ?? "").trim().slice(0, 80),
        plan: url.searchParams.get("plan") ?? undefined,
        billing: url.searchParams.get("billing") ?? undefined,
        page_path: window.location.pathname,
      });
    }
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  // Semnal de la server (cont creat). Evenimentul `purchase` se trimite din pagina
  // de rezultat a plății, doar când Netopia a confirmat-o (abonament/.../rezultat).
  // Rulează la fiecare schimbare de pagină, fiindcă redirect-ul unei acțiuni de
  // server e o navigare client-side, nu o reîncărcare.
  useEffect(() => {
    if (citesteSiStergeSemnal() === "sign_up") {
      trackEvent("sign_up", { method: "email" });
    }

    const { group, orgSlug } = grupDeContinut(pathname);
    trimitePaginaContext(group, orgSlug, pathname);
  }, [pathname]);

  return null;
}
