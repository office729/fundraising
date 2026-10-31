import Link from "next/link";
import { redirect } from "next/navigation";

import { esteBeneficiarLogat, getAuthUser, getMyOrgSlug } from "@/lib/auth/dal";
import { extractPlanQuery } from "@/lib/billing/plan-query";
import { getLocale } from "@/lib/i18n/get-locale";
import { MARKETING_DICT } from "@/lib/i18n/dictionaries/marketing";

import { FinalizeForm } from "./finalize-form";
import { metadatePagina } from "@/lib/page-titles";
import { PanouPreview } from "./panou-preview";
import { NotaCrmMarketing } from "./nota-crm-marketing";
import { CampaniiSectiune } from "./campanii-sectiune";
import { getCampaniiLanding, PRAG_ORGANIZATII } from "@/lib/campanii-publice";
import { JsonLd } from "@/components/seo/json-ld";
import { NUME_PACHET_FIX, PACKAGE_LIMITS } from "@/lib/billing/packages";
import { schemaAplicatie, schemaOrganizatie, schemaSite } from "@/lib/seo-schema";

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Un user logat cu organizație poate vedea în continuare site-ul (antetul îi arată „Intră în platformă”); după autentificare
  // ajunge în CRM prin redirecționările de la login și din /auth/callback, nu prin această pagină.
  const authUser = await getAuthUser();
  const myOrgSlug = authUser ? await getMyOrgSlug() : null;
  // Verificat înainte de FinalizeForm — un beneficiar logat nu trebuie să
  // vadă formularul de finalizare a unui cont de ONG (acela nu se aplică lui).
  if (authUser && (await esteBeneficiarLogat())) {
    redirect("/beneficiar");
  }
  // Autentificat (de obicei prin Google, primul login) dar fără organizație
  // încă — spre deosebire de fluxul clasic de /signup, contul Supabase deja
  // există aici, mai lipsește doar numele organizației.
  if (authUser?.email && !myOrgSlug) {
    const sp = await searchParams;
    // Valorile alese la înscrierea cu email (păstrate în metadatele contului cât
    // timp emailul aștepta confirmarea) servesc drept implicit; query-ul are prioritate.
    const meta = (authUser.user_metadata ?? {}) as { org_name?: unknown; full_name?: unknown; telefon?: unknown; cif?: unknown; ref?: unknown; plan_query?: unknown };
    const metaPlan = meta.plan_query && typeof meta.plan_query === "object" ? (meta.plan_query as Record<string, unknown>) : {};
    const dinQuery = extractPlanQuery((key) => {
      const value = sp[key];
      return Array.isArray(value) ? value[0] : value;
    });
    const planValues = Object.keys(dinQuery).length
      ? dinQuery
      : extractPlanQuery((key) => (typeof metaPlan[key] === "string" ? (metaPlan[key] as string) : undefined));
    const refValue = sp.ref;
    const referralCode = (Array.isArray(refValue) ? refValue[0] : refValue) ?? (typeof meta.ref === "string" ? meta.ref : "");
    const orgNameInitial = typeof meta.org_name === "string" ? meta.org_name : "";
    const text = (v: unknown) => (typeof v === "string" ? v : "");
    return (
      <FinalizeForm
        locale={await getLocale()}
        email={authUser.email}
        planValues={planValues}
        referralCode={referralCode}
        orgNameInitial={orgNameInitial}
        numeInitial={text(meta.full_name)}
        telefonInitial={text(meta.telefon)}
        cifInitial={text(meta.cif)}
      />
    );
  }

  const locale = await getLocale();
  const dict = MARKETING_DICT[locale];
  // Secțiunea „Descoperă campanii” e ascunsă cât timp nu există campanii active (nu mai încărcăm nici datele ei). Pune true ca să reapară.
  const AFISEAZA_CAMPANII_PE_SITE = false;
  // Dacă baza nu răspunde, pagina de marketing merge mai departe fără secțiunea de campanii.
  const campanii = AFISEAZA_CAMPANII_PE_SITE ? await getCampaniiLanding().catch(() => null) : null;

  return (
    <main>
      <JsonLd date={schemaOrganizatie()} />
      <JsonLd date={schemaSite(locale)} />
      <JsonLd
        date={schemaAplicatie(
          [
            { nume: NUME_PACHET_FIX.start, pretLunar: PACKAGE_LIMITS.start.pretLunar! },
            { nume: NUME_PACHET_FIX.crestere, pretLunar: PACKAGE_LIMITS.crestere.pretLunar! },
            { nume: NUME_PACHET_FIX.impact, pretLunar: PACKAGE_LIMITS.impact.pretLunar! },
          ],
          locale === "ro" ? "Platformă de fundraising pentru ONG-uri: CRM pentru donatori și companii, pagini de donații, Formular 230 și Declarația 177." : "Fundraising platform for NGOs: CRM for donors and companies, donation pages, Form 230 and Declaration 177.",
        )}
      />
      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-blue px-[6%] pt-12 pb-10 text-center text-white md:pt-14 md:pb-12">
        {/* Textură de fundal — pete de lumină + grilă fină de puncte, fără nicio imagine */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle,white_1px,transparent_1px)] [background-size:26px_26px]" />
          <div className="absolute top-[-18%] right-[-10%] h-[420px] w-[420px] rounded-full bg-brand-green/25 blur-[110px]" />
          <div className="absolute bottom-[-25%] left-[-12%] h-[460px] w-[460px] rounded-full bg-[#3d6fb0]/40 blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-3xl">
          <p className="mx-auto mb-5 flex max-w-full flex-col items-center gap-2 rounded-2xl border border-white/20 bg-white/10 p-1.5 text-sm text-white sm:inline-flex sm:flex-row sm:rounded-full sm:pr-5">
            <span className="rounded-full bg-brand-green px-3.5 py-1 font-bold whitespace-nowrap text-white">{dict.hero.trialEticheta}</span>
            <span className="px-3 pb-1 text-white/90 sm:px-0 sm:pb-0">{dict.hero.trialText}</span>
          </p>
          <h1 className="font-display text-[28px] leading-[1.15] font-bold text-balance sm:text-[36px]">
            {dict.hero.titlePre}
            <span className="text-brand-green">{dict.hero.titleHighlight}</span>
            {dict.hero.titlePost}
          </h1>
          <div className="mt-6 flex flex-wrap justify-center gap-3.5">
            <Link
              href="/signup"
              className="rounded-md bg-brand-green px-7 py-3.5 font-bold text-white transition hover:bg-brand-green-hover"
            >
              {dict.hero.ctaPrimary}
            </Link>
            <Link
              href="#platforma"
              className="rounded-md border-[1.5px] border-[#2e639b] px-7 py-3.5 font-bold text-white transition hover:border-white"
            >
              {dict.hero.ctaSecondary}
            </Link>
          </div>
          <p className="mt-3 text-xs text-white/70 sm:text-sm">{dict.hero.ctaNota}</p>

          {/* Cifre de impact — scoase din text, ca element vizual propriu */}
          <div className="mt-6 grid grid-cols-3 divide-x divide-white/15 rounded-2xl border border-white/15 bg-white/[0.06] backdrop-blur-sm">
            {dict.hero.stats.map((s) => (
              <div key={s.l} className="px-3 py-2.5 sm:px-6">
                <p className="font-display text-lg font-extrabold text-white sm:text-2xl">{s.n}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-white/65 sm:text-xs">{s.l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tranziție curbă spre restul paginii */}
        <svg
          className="absolute right-0 bottom-[-1px] left-0 h-8 w-full text-canvas sm:h-12"
          viewBox="0 0 1440 80"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M0,80 C360,10 1080,10 1440,80 L1440,80 L0,80 Z" fill="currentColor" />
        </svg>
      </section>

      {/* Panoul de administrare (ilustrație cu date demonstrative) */}
      <PanouPreview locale={locale} />

      {/* Ce înseamnă „CRM” — termenul nu e cunoscut ONG-urilor mici */}
      <NotaCrmMarketing locale={locale} />

      {/* Campanii de strângere de fonduri — se activează după primele PRAG_ORGANIZATII organizații */}
      {campanii && <CampaniiSectiune stare={{ ...campanii, prag: PRAG_ORGANIZATII }} locale={locale} />}

      {/* De ce Alexandrit */}
      <section className="bg-panel-2 px-[6%] py-16">
        <h2 className="font-display mx-auto max-w-2xl text-center text-[32px] font-bold text-ink">{dict.valori.title}</h2>
        <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-3">
          {dict.valori.items.map((v) => (
            <div key={v.t} className="rounded-xl border border-line bg-panel p-6 text-center">
              <h3 className="font-display text-base font-bold text-ink">{v.t}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{v.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimoniale */}
      <section className="px-[6%] py-16">
        <h2 className="font-display mx-auto max-w-2xl text-center text-[32px] font-bold text-ink">{dict.testimoniale.title}</h2>
        <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-5 sm:grid-cols-2">
          {dict.testimoniale.items.map((t) => (
            <div key={t.nume} className="rounded-2xl border border-line bg-panel-2 p-7">
              <p className="text-[15px] leading-relaxed text-body italic">&bdquo;{t.citat}&rdquo;</p>
              <p className="mt-4 font-extrabold text-ink">{t.nume}</p>
              <p className="text-sm text-muted-2">{t.rol}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

// Titlu întreg (fără sufixul „ — Alexandrit”): pagina de start e chiar brandul.
export async function generateMetadata() {
  return await metadatePagina("acasa");
}
