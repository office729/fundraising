"use client";

import { useMemo } from "react";

import { INSTRUMENTE_UI_DICT } from "@/lib/i18n/dictionaries/instrumente-ui";
import { antetDinOrganizatie, campuriNecompletate, curataDateScrisoare, dateScrisoareExemplu, dateScrisoareGoale, MECANISME_SCRISOARE, MODELE_SCRISORI, TIPURI_SCRISOARE, type DateScrisoare, type InfoOrganizatie } from "@/lib/scrisori";
import { MOTIVE } from "@/lib/motiv";
import { randeazaScrisoare } from "@/lib/scrisori-modele";
import { paletaDinHex } from "@/lib/raport-impact-culori";

import { useLocale } from "../../lib/locale-context";
import { GalerieSabloane } from "../_comun/galerie-sabloane";
import { GeneratorDocument, type Banner, type GrupDef } from "../_comun/generator-document";
import { traduElemente } from "../_comun/tradu";

const accenteOrg = (o: InfoOrganizatie) => {
  const p = o.culoare ? paletaDinHex(o.culoare) : null;
  return p ? { accent: p.accent, accent2: p.accent2, accent3: p.accent3 } : undefined;
};

export function GalerieScrisori({ orgSlug, org, azi }: { orgSlug: string; org: InfoOrganizatie; azi: string }) {
  const locale = useLocale();
  const d = INSTRUMENTE_UI_DICT[locale].galerieScrisori;
  const modele = useMemo(() => {
    const ex = dateScrisoareExemplu({ nume: org.nume, antetLinii: antetDinOrganizatie(org), logo: org.logo, acc: accenteOrg(org) }, azi);
    return traduElemente(MODELE_SCRISORI, "scrisori", locale).map((m) => ({ id: m.id, eticheta: m.eticheta, hint: m.hint, html: randeazaScrisoare(ex, m.id) }));
  }, [org, azi, locale]);
  return (
    <GalerieSabloane
      titlu={d.titlu}
      subtitlu={d.subtitlu(MODELE_SCRISORI.length)}
      hrefGenerator={`/${orgSlug}/crm/instrumente/scrisori/generator`}
      modele={modele}
      lat={794}
      inalt={1123}
      coloane="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
      recomandate={["clasic", "modern", "minimal", "elegant", "corporate"].filter((id) => MODELE_SCRISORI.some((m) => m.id === id))}
    />
  );
}

const PERSONALE = ["sumaCeruta", "rezultat", "termen", "destNume", "destFunctie", "destFirma", "destAdresa", "logoDestinatar", "nrInregistrare", "semnNume", "semnFunctie", "ps", "anexe", "suma", "proiect", "an"];

export function GeneratorScrisori({ orgSlug, org, azi, model, semnatar, dateIni, firmaId, bannere }: { orgSlug: string; org: InfoOrganizatie; azi: string; model?: string; semnatar: { nume: string; functie: string }; dateIni?: Record<string, unknown>; firmaId: string | null; bannere: Banner[] }) {
  const locale = useLocale();
  const t = INSTRUMENTE_UI_DICT[locale].scrisori;
  const g = t.grupuri;
  const modeleTrad = useMemo(() => traduElemente(MODELE_SCRISORI, "scrisori", locale), [locale]);
  const mecanisme = useMemo(() => traduElemente(MECANISME_SCRISOARE, "mecanismeScrisoare", locale), [locale]);
  const motive = useMemo(() => traduElemente(MOTIVE, "motive", locale), [locale]);
  const tipuri = useMemo(() => traduElemente(TIPURI_SCRISOARE, "tipuriScrisoare", locale), [locale]);
  const GRUPURI: GrupDef[] = [
    {
      titlu: g.destinatar,
      campuri: [
        { cheie: "destNume", eticheta: g.destNume, jumatate: true },
        { cheie: "destFunctie", eticheta: g.destFunctie, jumatate: true },
        { cheie: "destFirma", eticheta: g.destFirma, placeholder: g.destFirmaEx },
        { cheie: "destAdresa", eticheta: g.destAdresa, tip: "textarea", rows: 2, ajutor: g.destAdresaAjutor },
      ],
    },
    {
      titlu: g.scrisoarea,
      campuri: [
        { cheie: "loc", eticheta: g.loc, jumatate: true },
        { cheie: "data", eticheta: g.data, tip: "data", jumatate: true },
        { cheie: "nrInregistrare", eticheta: g.nrInregistrare, placeholder: g.nrEx },
        { cheie: "subiect", eticheta: g.subiect },
        { cheie: "formulaAdresare", eticheta: g.formulaAdresare },
        { cheie: "corp", eticheta: g.corp, tip: "textarea", rows: 11, ajutor: g.corpAjutor },
        { cheie: "formulaFinala", eticheta: g.formulaFinala },
      ],
    },
    {
      titlu: g.cerere,
      subtitlu: g.cerereSub,
      campuri: [
        { cheie: "sumaCeruta", eticheta: g.sumaCeruta, placeholder: g.sumaCerutaEx, jumatate: true },
        { cheie: "termen", eticheta: g.termen, placeholder: g.termenEx, jumatate: true },
        { cheie: "rezultat", eticheta: g.rezultat, placeholder: g.rezultatEx },
        { cheie: "mecanism", eticheta: g.mecanism, tip: "select", optiuni: mecanisme, ajutor: g.mecanismAjutor },
      ],
    },
    {
      titlu: g.dateText,
      subtitlu: g.dateTextSub,
      campuri: [
        { cheie: "suma", eticheta: g.suma, placeholder: g.sumaEx, jumatate: true },
        { cheie: "an", eticheta: g.an, placeholder: g.anEx, jumatate: true },
        { cheie: "proiect", eticheta: g.proiect },
      ],
    },
    {
      titlu: g.semnatura,
      campuri: [
        { cheie: "semnNume", eticheta: g.semnNume, jumatate: true },
        { cheie: "semnFunctie", eticheta: g.semnFunctie, jumatate: true },
        { cheie: "ps", eticheta: g.ps, tip: "textarea", rows: 2 },
        { cheie: "anexe", eticheta: g.anexe, placeholder: g.anexeEx },
      ],
    },
    {
      titlu: g.antet,
      subtitlu: g.antetSub,
      campuri: [
        { cheie: "antetNume", eticheta: g.antetNume },
        { cheie: "motivGrafic", eticheta: g.motivGrafic, tip: "select", optiuni: motive, ajutor: g.motivAjutor },
        { cheie: "antetLinii", eticheta: g.antetLinii, tip: "textarea", rows: 3, ajutor: g.antetLiniiAjutor },
      ],
    },
  ];
  const modelValid = MODELE_SCRISORI.some((m) => m.id === model) ? (model as DateScrisoare["model"]) : undefined;
  const initial = useMemo<DateScrisoare>(() => {
    const d = dateScrisoareGoale({ nume: org.nume, antetLinii: antetDinOrganizatie(org), logo: org.logo, acc: accenteOrg(org) }, azi);
    const baza = { ...d, semnNume: semnatar.nume, semnFunctie: semnatar.functie, ...(dateIni ?? {}), ...(modelValid ? { model: modelValid } : {}) };
    // Logoul și antetul vin mereu din Setări (un document redeschis nu poartă logo-uri), iar data e cea de azi.
    return curataDateScrisoare({ ...baza, logoOng: org.logo || (dateIni?.logoOng as string | undefined) || "", data: dateIni ? (dateIni.data as string | undefined) || azi : azi }, azi);
  }, [org, azi, modelValid, semnatar, dateIni]);
  return (
    <GeneratorDocument<DateScrisoare>
      orgSlug={orgSlug}
      cheieTool="scrisori"
      titlu={t.titluGenerator}
      galerieHref={`/${orgSlug}/crm/instrumente/scrisori`}
      modele={modeleTrad}
      date={initial}
      curata={(b) => curataDateScrisoare(b, azi)}
      randeaza={randeazaScrisoare}
      grupuri={GRUPURI}
      tipuri={{ cheie: "tip", eticheta: t.tipulScrisorii, optiuni: tipuri.map((x) => ({ id: x.id, eticheta: x.eticheta, patch: { subiect: x.subiect, formulaAdresare: x.formulaAdresare, corp: x.corp, formulaFinala: x.formulaFinala } })) }}
      logoOng={{ cheie: "logoOng", implicit: org.logo }}
      logoDestinatar={{ cheie: "logoDestinatar", eticheta: t.logoDestinatar }}
      culoareOrganizatie={org.culoare}
      numeFisier={(d) => `scrisoare-${d.destFirma || d.destNume || "document"}`}
      titluIstoric={(d) => `${d.subiect || t.titluGenerator} — ${d.destFirma || d.destNume || t.faraDestinatar}`}
      numerotare={{ cheie: "nrInregistrare" }}
      campuriPersonale={PERSONALE}
      modelDinUrl={modelValid}
      datePregatite={!!dateIni}
      firmaId={firmaId}
      bannere={bannere}
      avertizare={(d) => {
        const lipsa = campuriNecompletate(d);
        if (lipsa.length) return t.completeaza(lipsa.join(", "));
        return d.corp.length > 2400 ? t.textLung : null;
      }}
      ajutor={t.ajutor}
    />
  );
}
