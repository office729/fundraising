import { CalendlyInlineWidget } from "@/components/calendly-inline-widget";
import { CALENDLY_CONSULTANTA_URL } from "@/lib/calendly";
import { getLocale } from "@/lib/i18n/get-locale";
import { titluPagina } from "@/lib/page-titles";

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

export default async function ConsultantaPage() {
  const t = TEXT[await getLocale()];
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
      <CalendlyInlineWidget url={CALENDLY_CONSULTANTA_URL} loadingLabel={t.loading} />
    </div>
  );
}

export async function generateMetadata() {
  return { title: await titluPagina("crmConsultanta") };
}
