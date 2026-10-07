"use client";

import { useState, useTransition } from "react";

import type { Locale } from "@/lib/i18n/config";

import { stergeOrganizatiaAction } from "./organizatie-actions";

const T = {
  ro: {
    titlu: "Date și ștergerea organizației",
    export: "Descarcă toate datele (JSON)",
    exportDesc: "Exportă datele organizației (contacte, donatori, campanii, plăți, membri). Fără chei secrete sau tokenuri.",
    zona: "Zonă periculoasă",
    stergeDesc: (slug: string) =>
      `Șterge definitiv organizația și toate datele ei: contacte, donatori, campanii, plăți, invitații, membri și fișierele încărcate (logo, poze, facturi). Nu se poate anula. Pentru confirmare, scrie „${slug}”.`,
    placeholder: "slug-ul organizației",
    sterge: "Șterge organizația",
    seSterge: "Se șterge...",
  },
  en: {
    titlu: "Data and deleting the organization",
    export: "Download all data (JSON)",
    exportDesc: "Exports the organization's data (contacts, donors, campaigns, payments, members). No secret keys or tokens.",
    zona: "Danger zone",
    stergeDesc: (slug: string) =>
      `Permanently deletes the organization and all of its data: contacts, donors, campaigns, payments, invitations, members and uploaded files (logo, photos, invoices). This cannot be undone. To confirm, type “${slug}”.`,
    placeholder: "organization slug",
    sterge: "Delete organization",
    seSterge: "Deleting...",
  },
} as const;

export function OrganizatieSection({ orgSlug, locale }: { orgSlug: string; locale: Locale }) {
  const t = T[locale];
  const [confirmare, setConfirmare] = useState("");
  const [eroare, setEroare] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <section id="date-organizatie" className="mt-8 scroll-mt-4 rounded-xl border border-line bg-panel p-5">
      <h2 className="font-medium text-ink">{t.titlu}</h2>
      <p className="mt-1 text-xs text-muted">{t.exportDesc}</p>
      <a
        href={`/api/${orgSlug}/export`}
        className="mt-3 inline-block rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink transition hover:bg-panel-2"
      >
        {t.export}
      </a>

      <div className="mt-6 rounded-lg border border-red-300 p-4">
        <p className="text-sm font-semibold text-red-600">{t.zona}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">{t.stergeDesc(orgSlug)}</p>
        <input
          value={confirmare}
          onChange={(e) => setConfirmare(e.target.value)}
          placeholder={t.placeholder}
          className="mt-3 w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink"
        />
        {eroare && <p className="mt-2 text-sm text-red-600">{eroare}</p>}
        <button
          type="button"
          disabled={pending || confirmare.trim() !== orgSlug}
          onClick={() =>
            startTransition(async () => {
              setEroare(null);
              const r = await stergeOrganizatiaAction(orgSlug, confirmare);
              if (r.error) setEroare(r.error);
              else window.location.href = "/";
            })
          }
          className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
        >
          {pending ? t.seSterge : t.sterge}
        </button>
      </div>
    </section>
  );
}
