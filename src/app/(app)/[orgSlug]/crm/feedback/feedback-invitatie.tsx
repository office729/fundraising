"use client";

import { MessageSquareHeart, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { cereInvitatieChestionarAction } from "./actions";

const ZILE_AMANARE = 14; // „Mai târziu” ascunde invitația două săptămâni
const MS_ZI = 86_400_000;

// Invitație discretă să completezi chestionarul. Server-ul decide dacă are sens (după câteva zile de la înscriere, o dată la trei luni);
// întrebăm cel mult o dată pe sesiune de browser și nu insistăm: „Mai târziu” o ascunde pentru două săptămâni.
export function FeedbackInvitatie({ orgSlug }: { orgSlug: string }) {
  const pathname = usePathname();
  const [vizibila, setVizibila] = useState(false);
  const cheieAmanare = `fa-feedback-amanat-${orgSlug}`;
  const cheieSesiune = `fa-feedback-verificat-${orgSlug}`;

  useEffect(() => {
    try {
      const amanat = Number(window.localStorage.getItem(cheieAmanare) ?? 0);
      if (amanat && Date.now() - amanat < ZILE_AMANARE * MS_ZI) return;
      if (window.sessionStorage.getItem(cheieSesiune)) return;
      window.sessionStorage.setItem(cheieSesiune, "1");
    } catch {
      // fără stocare locală (mod privat): întrebăm o dată la încărcare, ceea ce e în regulă
    }
    let anulat = false;
    cereInvitatieChestionarAction(orgSlug)
      .then((da) => {
        if (!anulat && da) setVizibila(true);
      })
      .catch(() => {});
    return () => {
      anulat = true;
    };
  }, [orgSlug, cheieAmanare, cheieSesiune]);

  if (!vizibila || pathname.endsWith("/crm/feedback")) return null;

  function amana() {
    setVizibila(false);
    try {
      window.localStorage.setItem(cheieAmanare, String(Date.now()));
    } catch {
      // ascunsă doar pentru pagina curentă
    }
  }

  return (
    <div data-org-chrome className="border-b border-[var(--ci-border)] bg-[var(--ci-surface-2)] px-4 py-2.5 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2">
        <MessageSquareHeart className="h-4 w-4 shrink-0 text-[var(--ci-primary)]" aria-hidden="true" />
        <p className="min-w-0 flex-1 text-[13px] text-[var(--ci-text)]">
          <span className="font-semibold">Cum merge cu Alexandrit?</span> Două minute din timpul tău ne ajută să construim ce îți trebuie.
        </p>
        <Link
          prefetch={false}
          href={`/${orgSlug}/crm/feedback`}
          className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-primary)] px-3.5 py-1.5 text-[13px] font-semibold whitespace-nowrap text-white transition hover:bg-[var(--ci-primary-hover)]"
        >
          Completează chestionarul
        </Link>
        <button type="button" onClick={amana} className="flex items-center gap-1 text-[13px] font-medium whitespace-nowrap text-[var(--ci-text-muted)] transition hover:text-[var(--ci-text)]">
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          Mai târziu
        </button>
      </div>
    </div>
  );
}
