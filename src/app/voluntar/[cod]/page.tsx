import { ArrowRight, Award, Check, Megaphone, Star, Target, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CANALE_VOLUNTAR, insigneObtinute, MISIUNE_NR, numeCanal, urmatoareaInsigna } from "@/lib/voluntari-panou";
import {
  asiguraMisiunea,
  campaniaSaptamanii,
  campaniiVizibile,
  cifreVoluntar,
  cuOrg,
  progresCampanie,
  rezolvaCod,
  topSaptamana,
  totalOrganizatie,
  vizitatorDinCookie,
  type CampaniePanou,
} from "@/lib/voluntari-panou-server";

import { Bara, PanouShell } from "./shell";
import { TelefonForm, WelcomeForm } from "./welcome-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ cod: string }> }): Promise<Metadata> {
  const link = await rezolvaCod((await params).cod);
  return { title: link ? `Panou voluntari · ${link.org.nume}` : "Panou voluntari" };
}

function Imagine({ c, className }: { c: Pick<CampaniePanou, "imagineUrl">; className: string }) {
  if (!c.imagineUrl) return <div className={`${className} bg-[#f3ece5]`} aria-hidden />;
  // eslint-disable-next-line @next/next/no-img-element -- imagine din Supabase Storage, domeniu dinamic
  return <img src={c.imagineUrl} alt="" loading="lazy" className={`${className} object-cover`} />;
}

const lei = (n: number) => `${n.toLocaleString("ro-RO")} lei`;

export default async function PanouVoluntari({ params }: { params: Promise<{ cod: string }> }) {
  const { cod } = await params;
  const link = await rezolvaCod(cod);
  if (!link) notFound();
  const { org } = link;

  const date = await cuOrg(org.id, async (tx) => {
    const v = await vizitatorDinCookie(tx, org.id);
    if (!v) return null;
    const campanii = await campaniiVizibile(tx, org.id);
    const vedetaId = await campaniaSaptamanii(tx, org.id);
    const misiune = await asiguraMisiunea(tx, org.id, v, campanii, vedetaId);
    const [cifre, total, top] = await Promise.all([cifreVoluntar(tx, org.id, v.id), totalOrganizatie(tx, org.id), topSaptamana(tx, org.id)]);
    return { v, campanii, vedetaId, misiune, cifre, total, top };
  });

  if (!date) {
    return (
      <PanouShell
        org={org}
        antet={
          <div className="mt-5">
            <h1 className="font-display text-[26px] leading-tight font-bold">Dă mai departe o campanie.</h1>
            <p className="mt-1.5 max-w-md text-[15px] opacity-95">Alegi o campanie, copiezi mesajul gata scris și îl trimiți oamenilor tăi. Fiecare distribuire contează.</p>
          </div>
        }
      >
        <WelcomeForm cod={cod} orgNume={org.nume} />
      </PanouShell>
    );
  }

  const { v, campanii, vedetaId, misiune, cifre, total, top } = date;
  const dupaId = new Map(campanii.map((c) => [c.id, c]));
  const vedeta = vedetaId ? dupaId.get(vedetaId) : undefined;
  const actiuni = misiune.filter((a) => dupaId.has(a.campaignId));
  const facute = actiuni.filter((a) => a.facuta).length;
  const insigne = insigneObtinute(cifre.total);
  const urmatoarea = urmatoareaInsigna(cifre.total);
  const listaCampanii = [...(vedeta ? [vedeta] : []), ...campanii.filter((c) => c.id !== vedetaId)];
  const urlCampanie = (slug: string, canal?: string) => `/voluntar/${cod}/campanie/${slug}${canal ? `?canal=${canal}` : ""}`;

  return (
    <PanouShell
      org={org}
      antet={
        <>
          <h1 className="mt-4 font-display text-[28px] leading-tight font-bold">Bună, {v.prenume}!</h1>
          <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              { n: campanii.length, e: "campanii active" },
              { n: cifre.total, e: "distribuirile tale" },
              { n: total, e: "distribuiri în total" },
            ].map((x) => (
              <div key={x.e} className="rounded-xl bg-white/15 px-2 py-2.5 backdrop-blur-sm">
                <dt className="sr-only">{x.e}</dt>
                <dd className="font-display text-[24px] leading-none font-bold tabular-nums">{x.n}</dd>
                <dd className="mt-1 text-[11.5px] opacity-90">{x.e}</dd>
              </div>
            ))}
          </dl>
        </>
      }
    >
      {campanii.length === 0 ? (
        <section className="rounded-2xl border border-[var(--vp-line)] bg-white p-6 text-center">
          <Megaphone className="mx-auto size-8 text-[var(--vp-muted)]" aria-hidden />
          <h2 className="mt-2 font-display text-[18px] font-bold">Nicio campanie activă acum</h2>
          <p className="mt-1 text-[14px] text-[var(--vp-muted)]">Revino în curând: echipa publică aici campaniile de distribuit.</p>
        </section>
      ) : (
        <>
          {vedeta && (
            <section aria-labelledby="vedeta" className="overflow-hidden rounded-2xl border border-[var(--vp-gold-line)] bg-[var(--vp-gold-bg)]">
              <div className="flex items-center gap-2 px-4 pt-3.5 text-[12.5px] font-bold tracking-wide text-[var(--vp-gold)] uppercase">
                <Star className="size-4 fill-current" aria-hidden /> <span id="vedeta">Campania săptămânii</span>
              </div>
              <Link href={urlCampanie(vedeta.slug)} className="mt-2 block focus-visible:ring-2 focus-visible:ring-[var(--vp-gold)] focus-visible:outline-none">
                {vedeta.imagineUrl && <Imagine c={vedeta} className="h-44 w-full" />}
                <div className="p-4">
                  <h2 className="font-display text-[20px] leading-snug font-bold">{vedeta.titlu}</h2>
                  {progresCampanie(vedeta) !== null && (
                    <div className="mt-3">
                      <Bara valoare={progresCampanie(vedeta)!} culoare="var(--vp-gold)" />
                      <p className="mt-1 text-[12.5px] text-[var(--vp-muted)]">
                        {lei(vedeta.sumaStransa)} din {lei(vedeta.sumaTinta!)}
                      </p>
                    </div>
                  )}
                  <span className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[var(--vp-ink)] px-4 py-2.5 text-[14.5px] font-semibold text-white">
                    Distribuie <ArrowRight className="size-4" aria-hidden />
                  </span>
                </div>
              </Link>
            </section>
          )}

          {actiuni.length > 0 && (
            <section aria-labelledby="misiune" className="rounded-2xl border border-[var(--vp-gold-line)] bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 id="misiune" className="flex items-center gap-2 font-display text-[17px] font-bold">
                  <Target className="size-5 text-[var(--vp-gold)]" aria-hidden /> Misiunea ta de azi
                </h2>
                <span className="rounded-full bg-[var(--vp-gold-bg)] px-2.5 py-1 text-[12.5px] font-bold text-[var(--vp-gold)] tabular-nums">
                  {facute}/{actiuni.length} azi
                </span>
              </div>
              <div className="mt-3">
                <Bara valoare={facute / Math.max(1, Math.min(MISIUNE_NR, actiuni.length))} culoare="var(--vp-green)" />
              </div>
              <ul className="mt-3 divide-y divide-[var(--vp-line)]">
                {actiuni.map((a) => {
                  const c = dupaId.get(a.campaignId)!;
                  return (
                    <li key={`${a.campaignId}|${a.canal}`}>
                      <Link href={urlCampanie(c.slug, a.canal)} className="flex items-center gap-3 py-2.5 focus-visible:rounded-lg focus-visible:ring-2 focus-visible:ring-[var(--vp-brand)] focus-visible:outline-none">
                        <span
                          className={`flex size-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${a.facuta ? "bg-[var(--vp-green-bg)] text-[var(--vp-green)]" : "bg-[#f3ece5] text-[var(--vp-muted)]"}`}
                          aria-hidden
                        >
                          {a.facuta ? <Check className="size-4" /> : a.ordine + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={`block truncate text-[14.5px] font-semibold ${a.facuta ? "text-[var(--vp-muted)] line-through" : ""}`}>{c.titlu}</span>
                          <span className="block text-[12.5px] text-[var(--vp-muted)]">{CANALE_VOLUNTAR.find((x) => x.id === a.canal)?.actiune ?? numeCanal(a.canal)}</span>
                        </span>
                        <span className="sr-only">{a.facuta ? "Făcut" : "De făcut"}</span>
                        {!a.facuta && <ArrowRight className="size-4 shrink-0 text-[var(--vp-muted)]" aria-hidden />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              {facute === actiuni.length && <p className="mt-2 rounded-lg bg-[var(--vp-green-bg)] px-3 py-2 text-[13.5px] font-semibold text-[var(--vp-green)]">Misiune îndeplinită azi. Mulțumim!</p>}
            </section>
          )}

          <section aria-labelledby="pasi">
            <h2 id="pasi" className="sr-only">
              Cum funcționează
            </h2>
            <ol className="grid grid-cols-3 gap-2 text-center text-[12.5px] font-semibold">
              {["Alege o campanie", "Copiază mesajul", "Trimite și bifează"].map((t, i) => (
                <li key={t} className="rounded-xl border border-[var(--vp-line)] bg-white px-2 py-3">
                  <span className="mx-auto mb-1.5 flex size-6 items-center justify-center rounded-full bg-[var(--vp-brand)] text-[12px] text-white">{i + 1}</span>
                  {t}
                </li>
              ))}
            </ol>
            <p className="mt-2 text-center text-[12.5px] text-[var(--vp-muted)]">Sfat: 3–5 distribuiri pe zi sunt suficiente. Trimite mesajul unor oameni pe care îi cunoști, nu în mod repetat aceleiași persoane.</p>
          </section>

          <section aria-labelledby="campanii">
            <h2 id="campanii" className="font-display text-[18px] font-bold">
              Campanii de distribuit
            </h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {listaCampanii.map((c) => {
                const p = progresCampanie(c);
                return (
                  <li key={c.id} className="overflow-hidden rounded-2xl border border-[var(--vp-line)] bg-white">
                    <Link href={urlCampanie(c.slug)} className="block h-full focus-visible:ring-2 focus-visible:ring-[var(--vp-brand)] focus-visible:outline-none">
                      <Imagine c={c} className="h-32 w-full" />
                      <div className="p-3.5">
                        <h3 className="font-display text-[15.5px] leading-snug font-bold">{c.titlu}</h3>
                        {c.judet && <p className="mt-0.5 text-[12.5px] text-[var(--vp-muted)]">{c.judet}</p>}
                        {p !== null && (
                          <div className="mt-2.5">
                            <Bara valoare={p} />
                            <p className="mt-1 text-[12px] text-[var(--vp-muted)] tabular-nums">
                              {lei(c.sumaStransa)} din {lei(c.sumaTinta!)} · {Math.round(p * 100)}%
                            </p>
                          </div>
                        )}
                        <span className="mt-3 inline-flex items-center gap-1 text-[14px] font-semibold text-[var(--vp-brand)]">
                          Distribuie <ArrowRight className="size-4" aria-hidden />
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}

      <section aria-labelledby="top" className="rounded-2xl border border-[var(--vp-line)] bg-white p-4">
        <h2 id="top" className="flex items-center gap-2 font-display text-[17px] font-bold">
          <Trophy className="size-5 text-[var(--vp-gold)]" aria-hidden /> Topul săptămânii
        </h2>
        <p className="text-[12.5px] text-[var(--vp-muted)]">Ultimele 7 zile. Mulțumim tuturor, indiferent de loc.</p>
        {top.length === 0 ? (
          <p className="mt-3 text-[14px] text-[var(--vp-muted)]">Nicio distribuire în ultimele 7 zile. Poți fi primul.</p>
        ) : (
          <ol className="mt-3 space-y-1.5">
            {top.map((t, i) => (
              <li key={t.id} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[14.5px] ${t.id === v.id ? "bg-[var(--vp-gold-bg)] font-semibold" : "bg-[#faf6f2]"}`}>
                <span className="w-5 text-center font-bold text-[var(--vp-muted)] tabular-nums">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate">
                  {t.prenume}
                  {t.id === v.id ? " (tu)" : ""}
                </span>
                <span className="tabular-nums">{t.nr}</span>
              </li>
            ))}
          </ol>
        )}

        <h3 className="mt-5 flex items-center gap-2 text-[13px] font-bold tracking-wide text-[var(--vp-muted)] uppercase">
          <Award className="size-4" aria-hidden /> Insignele tale
        </h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {insigne.length === 0 ? (
            <span className="text-[13.5px] text-[var(--vp-muted)]">Prima distribuire îți aduce prima insignă.</span>
          ) : (
            insigne.map((i) => (
              <span key={i.prag} className="rounded-full border border-[var(--vp-gold-line)] bg-[var(--vp-gold-bg)] px-3 py-1 text-[13px] font-semibold text-[var(--vp-gold)]">
                {i.nume}
              </span>
            ))
          )}
        </div>
        {urmatoarea && (
          <p className="mt-2 text-[12.5px] text-[var(--vp-muted)]">
            Încă {urmatoarea.prag - cifre.total} {urmatoarea.prag - cifre.total === 1 ? "distribuire" : "distribuiri"} până la „{urmatoarea.nume}”.
          </p>
        )}
      </section>

      {v.voluntarId ? (
        <p className="flex items-center gap-2 rounded-xl bg-[var(--vp-green-bg)] px-4 py-3 text-[13.5px] font-semibold text-[var(--vp-green)]">
          <Check className="size-4" aria-hidden /> Contribuția ta apare în fișa ta de voluntar.
        </p>
      ) : !v.telefon ? (
        <TelefonForm cod={cod} />
      ) : null}
    </PanouShell>
  );
}
