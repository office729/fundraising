"use client";

import { useEffect, useState } from "react";

import type { Recomandare } from "@/lib/billing/packages";
import type { Locale } from "@/lib/i18n/config";

import { obtineRecomandareAction } from "./billing-actions";

const NUME: Record<string, string> = { start: "START", crestere: "CREȘTERE", impact: "IMPACT" };

// „Pachetul potrivit pentru tine”: din ce a folosit organizația în proba gratuită (utilizatori, contacte, module) arată cel mai ieftin pachet care
// acoperă tot și, pentru fiecare pachet, ce ar lipsi. Alegerea rămâne a ei: e o recomandare, nu o obligație.
export function RecomandarePachet({ orgSlug, locale }: { orgSlug: string; locale: Locale }) {
  const [r, setR] = useState<Recomandare | null>(null);
  const [esuat, setEsuat] = useState(false);
  const ro = locale === "ro";

  useEffect(() => {
    let anulat = false;
    obtineRecomandareAction(orgSlug)
      .then((x) => {
        if (!anulat) setR(x);
      })
      .catch(() => {
        if (!anulat) setEsuat(true);
      });
    return () => {
      anulat = true;
    };
  }, [orgSlug]);

  // Fără recomandare (încă se calculează, sau a eșuat) nu afișăm nimic: alegerea pachetului merge oricum.
  if (!r || esuat) return null;
  const a = r.alegere;
  const pret = `${a.pretLunar} lei${ro ? "/lună" : "/month"}`;

  return (
    <section aria-labelledby="recomandare-titlu" className="mx-auto mb-6 max-w-3xl rounded-xl border border-line bg-panel p-4 sm:p-5">
      <h3 id="recomandare-titlu" className="font-display text-base font-bold text-ink">
        {ro ? "Pachetul potrivit pentru tine" : "The right plan for you"}
      </h3>
      <p className="mt-1 text-[13.5px] leading-relaxed text-body">
        {ro ? "Ce ai folosit în perioada de probă: " : "What you used during the trial: "}
        <b className="font-semibold text-ink">{r.folosit.join(", ")}</b>.
      </p>
      {r.depaseste ? (
        <p className="mt-2 text-[13.5px] leading-relaxed text-body">
          {ro
            ? "Ai depășit cotele oricărui pachet. IMPACT e cel mai apropiat; scrie-ne la vlad.placinta@alexandrit.ro ca să stabilim împreună o ofertă potrivită."
            : "You exceed the limits of every plan. IMPACT is the closest; write to vlad.placinta@alexandrit.ro and we will agree on a suitable offer."}
        </p>
      ) : (
        <p className="mt-2 text-[13.5px] leading-relaxed text-body">
          {ro ? "Cel mai ieftin pachet care acoperă tot: " : "The cheapest plan that covers everything: "}
          <b className="font-semibold text-brand-green">
            {NUME[a.pachet]}
            {a.extra > 0 ? (ro ? ` + ${a.extra} ${a.extra === 1 ? "utilizator suplimentar" : "utilizatori suplimentari"}` : ` + ${a.extra} extra ${a.extra === 1 ? "user" : "users"}`) : ""}
          </b>{" "}
          — {pret}.
        </p>
      )}
      <ul className="mt-3 space-y-1.5 text-[13px]">
        {r.evaluari.map((e) => (
          <li key={e.pachet} className="flex flex-wrap items-baseline gap-x-2">
            <span className="w-24 shrink-0 font-semibold text-ink">{NUME[e.pachet]}</span>
            <span className="tabular-nums text-body">{e.pretLunar} lei</span>
            <span className={e.acopera ? "text-brand-green" : "text-muted"}>
              {e.acopera ? (ro ? "acoperă tot ce ai folosit" : "covers everything you used") : `${ro ? "nu acoperă: " : "does not cover: "}${e.lipsuri.join("; ")}`}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[12px] text-muted-2">
        {ro
          ? "Recomandarea ține cont de ce se poate măsura (utilizatori, contacte, module cu date); vezi pe fiecare pachet ce mai include. Poți schimba pachetul la sfârșitul unei perioade plătite."
          : "The recommendation uses what can be measured (users, contacts, modules with data); see what each plan includes. You can change plan at the end of a paid period."}
      </p>
    </section>
  );
}
