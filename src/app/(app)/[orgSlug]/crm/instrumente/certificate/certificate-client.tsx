"use client";

import { useMemo } from "react";

import { INSTRUMENTE_UI_DICT } from "@/lib/i18n/dictionaries/instrumente-ui";
import { curataDateCertificat, dateCertificatExemplu, dateCertificatGoale, MODELE_CERTIFICATE, MODELE_PORTRET, TIPURI_CERTIFICAT, type DateCertificat } from "@/lib/certificate";
import { randeazaCertificat } from "@/lib/certificate-modele";
import { MOTIVE } from "@/lib/motiv";
import { paletaDinHex } from "@/lib/raport-impact-culori";
import type { InfoOrganizatie } from "@/lib/scrisori";

import { useLocale } from "../../lib/locale-context";
import { GalerieSabloane } from "../_comun/galerie-sabloane";
import { asiguraVerificareAction } from "../_comun/documente-actions";
import { GeneratorDocument, type Banner, type GrupDef } from "../_comun/generator-document";
import { traduElemente } from "../_comun/tradu";

const accenteOrg = (o: InfoOrganizatie) => {
  const p = o.culoare ? paletaDinHex(o.culoare) : null;
  return p ? { accent: p.accent, accent2: p.accent2, accent3: p.accent3 } : undefined;
};

export function GalerieCertificate({ orgSlug, org, azi }: { orgSlug: string; org: InfoOrganizatie; azi: string }) {
  const locale = useLocale();
  const d = INSTRUMENTE_UI_DICT[locale].galerieCertificate;
  const modele = useMemo(() => {
    const ex = dateCertificatExemplu({ nume: org.nume, logo: org.logo, acc: accenteOrg(org) }, azi);
    return traduElemente(MODELE_CERTIFICATE, "certificate", locale).map((m) => ({ id: m.id, eticheta: m.eticheta, hint: m.hint, html: randeazaCertificat(ex, m.id), ...(MODELE_PORTRET.includes(m.id) ? { lat: 794, inalt: 1123 } : {}) }));
  }, [org, azi, locale]);
  return (
    <GalerieSabloane
      titlu={d.titlu}
      subtitlu={d.subtitlu(MODELE_CERTIFICATE.length)}
      hrefGenerator={`/${orgSlug}/crm/instrumente/certificate/generator`}
      modele={modele}
      lat={1123}
      inalt={794}
      coloane="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
      recomandate={["clasic", "modern", "gala", "inima", "puls", "diploma"]}
    />
  );
}

const PERSONALE = ["destinatar", "detaliu", "citat", "logoDestinatar", "nrCertificat", "semn1Nume", "semn1Functie", "semn2Nume", "semn2Functie"];

export function GeneratorCertificate({ orgSlug, org, azi, model, semnatar, dateIni, firmaId, bannere, siteUrl }: { siteUrl: string; orgSlug: string; org: InfoOrganizatie; azi: string; model?: string; semnatar: { nume: string; functie: string }; dateIni?: Record<string, unknown>; firmaId: string | null; bannere: Banner[] }) {
  const locale = useLocale();
  const t = INSTRUMENTE_UI_DICT[locale].certificate;
  const g = t.grupuri;
  const modeleTrad = useMemo(() => traduElemente(MODELE_CERTIFICATE, "certificate", locale), [locale]);
  const motive = useMemo(() => traduElemente(MOTIVE, "motive", locale), [locale]);
  const tipuri = useMemo(() => traduElemente(TIPURI_CERTIFICAT, "tipuriCertificat", locale), [locale]);
  const GRUPURI: GrupDef[] = [
    {
      titlu: g.cuiSeAcorda,
      campuri: [
        { cheie: "destinatar", eticheta: g.destinatar, placeholder: g.destinatarEx },
        { cheie: "detaliu", eticheta: g.detaliu, placeholder: g.detaliuEx, ajutor: g.detaliuAjutor },
      ],
    },
    {
      titlu: g.textul,
      campuri: [
        { cheie: "titlu", eticheta: g.titlu },
        { cheie: "introducere", eticheta: g.introducere, placeholder: g.introducereEx },
        { cheie: "motiv", eticheta: g.motiv, tip: "textarea", rows: 4, ajutor: g.motivAjutor },
        { cheie: "citat", eticheta: g.citat },
      ],
    },
    {
      titlu: g.dataNumar,
      campuri: [
        { cheie: "loc", eticheta: g.loc, jumatate: true },
        { cheie: "data", eticheta: g.data, tip: "data", jumatate: true },
        { cheie: "nrCertificat", eticheta: g.nrCertificat, placeholder: g.nrEx },
      ],
    },
    {
      titlu: g.semnaturi,
      campuri: [
        { cheie: "semn1Nume", eticheta: g.semn1Nume, jumatate: true },
        { cheie: "semn1Functie", eticheta: g.functia, jumatate: true },
        { cheie: "semn2Nume", eticheta: g.semn2Nume, jumatate: true },
        { cheie: "semn2Functie", eticheta: g.functia, jumatate: true },
      ],
    },
    {
      titlu: g.verificare,
      subtitlu: g.verificareSub,
      campuri: [{ cheie: "verificareOnline", eticheta: g.verificare, tip: "bifa", placeholder: g.verificareBifa, ajutor: g.verificareAjutor }],
    },
    { titlu: g.organizatia, campuri: [{ cheie: "antetNume", eticheta: g.antetNume }, { cheie: "motivGrafic", eticheta: g.motivGrafic, tip: "select", optiuni: motive, ajutor: g.motivGraficAjutor }] },
  ];
  const modelValid = MODELE_CERTIFICATE.some((m) => m.id === model) ? (model as DateCertificat["model"]) : undefined;
  const initial = useMemo<DateCertificat>(() => {
    const d = dateCertificatGoale({ nume: org.nume, logo: org.logo, acc: accenteOrg(org) }, azi);
    const baza = { ...d, semn1Nume: semnatar.nume, semn1Functie: semnatar.functie, ...(dateIni ?? {}), ...(modelValid ? { model: modelValid } : {}) };
    return curataDateCertificat({ ...baza, logoOng: org.logo || (dateIni?.logoOng as string | undefined) || "", data: dateIni ? (dateIni.data as string | undefined) || azi : azi }, azi);
  }, [org, azi, modelValid, semnatar, dateIni]);
  return (
    <GeneratorDocument<DateCertificat>
      orgSlug={orgSlug}
      cheieTool="certificate"
      titlu={t.titluGenerator}
      galerieHref={`/${orgSlug}/crm/instrumente/certificate`}
      modele={modeleTrad}
      date={initial}
      curata={(b) => curataDateCertificat(b, azi)}
      randeaza={randeazaCertificat}
      grupuri={GRUPURI}
      tipuri={{ cheie: "tip", eticheta: t.tipulCertificatului, optiuni: tipuri.map((x) => ({ id: x.id, eticheta: x.eticheta, patch: { titlu: x.titlu, introducere: x.introducere, motiv: x.motiv } })) }}
      logoOng={{ cheie: "logoOng", implicit: org.logo }}
      logoDestinatar={{ cheie: "logoDestinatar", eticheta: t.logoDestinatar }}
      culoareOrganizatie={org.culoare}
      numeFisier={(d) => `certificat-${d.destinatar || "document"}`}
      titluIstoric={(d) => `${d.titlu || t.titluGenerator} — ${d.destinatar || INSTRUMENTE_UI_DICT[locale].scrisori.faraDestinatar}`}
      numerotare={{ cheie: "nrCertificat" }}
      campuriPersonale={PERSONALE}
      modelDinUrl={modelValid}
      datePregatite={!!dateIni}
      firmaId={firmaId}
      bannere={bannere}
      pregatesteExport={async (d) => {
        if (!d.verificareOnline) return d;
        const r = await asiguraVerificareAction(orgSlug, { cod: d.codVerificare, destinatar: d.destinatar, titlu: d.titlu, data: d.data, numar: d.nrCertificat });
        if (!r.ok) throw new Error(r.eroare);
        return { ...d, codVerificare: r.cod, urlVerificare: `${siteUrl}/v/${r.cod}` };
      }}
      ajutor={t.ajutor}
    />
  );
}
