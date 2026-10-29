import { Rezervare } from "@/components/programari/rezervare";
import { requireOrgAccess } from "@/lib/auth/guard";
import { paginaPublica } from "@/lib/programari/server";
import { getLocale } from "@/lib/i18n/get-locale";
import { titluAbsolut } from "@/lib/page-titles";

const TEXT = {
  ro: {
    title: "Programează o consultanță cu Vlad Plăcintă",
    subtitle:
      "O sesiune 1 la 1 în care îți arăt cum să lucrezi pe instrumentele platformei — sau le personalizăm împreună pentru felul în care lucrează organizația ta.",
    puncte: ["Îți arăt pas cu pas CRM-urile, newsletter-ul, one-pager-ul și programul de lucru", "Adaptăm instrumentele la nevoile echipei tale", "Răspund la întrebările echipei, în direct"],
    loading: "Se încarcă programarea...",
  },
  en: {
    title: "Book a consultation with Vlad Plăcintă",
    subtitle: "A 1-to-1 session where I show you how to work with the platform's tools — or we customise them together for the way your organisation works.",
    puncte: ["A step-by-step walkthrough of the CRMs, newsletter, one-pager and work schedule", "We adapt the tools to your team's needs", "Live answers to your team's questions"],
    loading: "Loading the booking calendar...",
  },
} as const;

export default async function ConsultantaPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  const t = TEXT[await getLocale()];
  const programari = await paginaPublica().catch(() => null);
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{t.title}</h1>
        <p className="mt-1 text-[13px] text-[var(--ci-text-muted)]">{t.subtitle}</p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-[13px] text-[var(--ci-text)]">
          {t.puncte.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </div>
      <Rezervare tipuri={programari?.tipuri ?? []} cereTelefon={programari?.setari.cereTelefon ?? false} sursa="consultanta" prefill={{ nume: access.userName ?? "", email: access.userEmail, organizatie: access.orgName }} />
    </div>
  );
}

export async function generateMetadata() {
  return titluAbsolut("crmConsultanta");
}
