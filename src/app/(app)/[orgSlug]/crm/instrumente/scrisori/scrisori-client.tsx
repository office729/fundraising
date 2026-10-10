"use client";

import { useMemo } from "react";

import { antetDinOrganizatie, curataDateScrisoare, dateScrisoareExemplu, dateScrisoareGoale, MODELE_SCRISORI, TIPURI_SCRISOARE, type DateScrisoare, type InfoOrganizatie } from "@/lib/scrisori";
import { randeazaScrisoare } from "@/lib/scrisori-modele";
import { paletaDinHex } from "@/lib/raport-impact-culori";

import { GalerieSabloane } from "../_comun/galerie-sabloane";
import { GeneratorDocument, type GrupDef } from "../_comun/generator-document";

const accenteOrg = (o: InfoOrganizatie) => {
  const p = o.culoare ? paletaDinHex(o.culoare) : null;
  return p ? { accent: p.accent, accent2: p.accent2, accent3: p.accent3 } : undefined;
};

export function GalerieScrisori({ orgSlug, org, azi }: { orgSlug: string; org: InfoOrganizatie; azi: string }) {
  const modele = useMemo(() => {
    const ex = dateScrisoareExemplu({ nume: org.nume, antetLinii: antetDinOrganizatie(org), logo: org.logo, acc: accenteOrg(org) }, azi);
    return MODELE_SCRISORI.map((m) => ({ id: m.id, eticheta: m.eticheta, hint: m.hint, html: randeazaScrisoare(ex, m.id) }));
  }, [org, azi]);
  return (
    <GalerieSabloane
      titlu="Scrisori: alege un șablon"
      subtitlu={`${MODELE_SCRISORI.length} modele de scrisoare cu antet, cu date de exemplu. Apasă pe unul ca să-l completezi.`}
      hrefGenerator={`/${orgSlug}/crm/instrumente/scrisori/generator`}
      modele={modele}
      lat={794}
      inalt={1123}
      coloane="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
    />
  );
}

const GRUPURI: GrupDef[] = [
  {
    titlu: "Destinatar",
    campuri: [
      { cheie: "destNume", eticheta: "Nume și prenume", jumatate: true },
      { cheie: "destFunctie", eticheta: "Funcția", jumatate: true },
      { cheie: "destFirma", eticheta: "Firma sau instituția", placeholder: "ex. Firma SRL" },
      { cheie: "destAdresa", eticheta: "Adresa", tip: "textarea", rows: 2, ajutor: "Câte un rând pentru fiecare linie." },
    ],
  },
  {
    titlu: "Scrisoarea",
    campuri: [
      { cheie: "loc", eticheta: "Localitatea", jumatate: true },
      { cheie: "data", eticheta: "Data", tip: "data", jumatate: true },
      { cheie: "nrInregistrare", eticheta: "Număr de înregistrare", placeholder: "ex. Nr. 125 / 10.10.2026" },
      { cheie: "subiect", eticheta: "Subiect" },
      { cheie: "formulaAdresare", eticheta: "Formula de adresare" },
      { cheie: "corp", eticheta: "Textul scrisorii", tip: "textarea", rows: 11, ajutor: "Paragrafele se despart printr-un rând liber. Se completează automat: {DESTINATAR}, {FIRMA}, {ORGANIZATIE}, {DATA}." },
      { cheie: "formulaFinala", eticheta: "Formula de încheiere" },
    ],
  },
  {
    titlu: "Semnătură",
    campuri: [
      { cheie: "semnNume", eticheta: "Nume semnatar", jumatate: true },
      { cheie: "semnFunctie", eticheta: "Funcția semnatarului", jumatate: true },
      { cheie: "ps", eticheta: "P.S. (opțional)", tip: "textarea", rows: 2 },
      { cheie: "anexe", eticheta: "Anexe (opțional)", placeholder: "ex. Raportul de impact 2025" },
    ],
  },
  {
    titlu: "Antet",
    subtitlu: "Datele organizației din antet și din subsol",
    campuri: [
      { cheie: "antetNume", eticheta: "Numele organizației" },
      { cheie: "antetLinii", eticheta: "Adresă, CIF, IBAN, contact", tip: "textarea", rows: 3, ajutor: "Câte un rând pentru fiecare informație." },
    ],
  },
];

export function GeneratorScrisori({ orgSlug, org, azi, model }: { orgSlug: string; org: InfoOrganizatie; azi: string; model?: string }) {
  const initial = useMemo<DateScrisoare>(() => {
    const d = dateScrisoareGoale({ nume: org.nume, antetLinii: antetDinOrganizatie(org), logo: org.logo, acc: accenteOrg(org) }, azi);
    return MODELE_SCRISORI.some((m) => m.id === model) ? { ...d, model: model as DateScrisoare["model"] } : d;
  }, [org, azi, model]);
  return (
    <GeneratorDocument<DateScrisoare>
      orgSlug={orgSlug}
      cheieTool="scrisori"
      titlu="Scrisoare cu antet"
      galerieHref={`/${orgSlug}/crm/instrumente/scrisori`}
      modele={MODELE_SCRISORI}
      date={initial}
      curata={(b) => curataDateScrisoare(b, azi)}
      randeaza={randeazaScrisoare}
      grupuri={GRUPURI}
      tipuri={{ cheie: "tip", eticheta: "Tipul scrisorii", optiuni: TIPURI_SCRISOARE.map((t) => ({ id: t.id, eticheta: t.eticheta, patch: { subiect: t.subiect, formulaAdresare: t.formulaAdresare, corp: t.corp, formulaFinala: t.formulaFinala } })) }}
      logoOng={{ cheie: "logoOng", implicit: org.logo }}
      logoDestinatar={{ cheie: "logoDestinatar", eticheta: "Logo destinatar (opțional)" }}
      culoareOrganizatie={org.culoare}
      numeFisier={(d) => `scrisoare-${d.destFirma || d.destNume || "document"}`}
      avertizare={(d) => (d.corp.length > 2400 ? "Textul e lung: scrisoarea poate depăși o pagină A4. Scurtează-l sau verifică la tipărire." : null)}
      ajutor="Alegi șablonul și tipul scrisorii, completezi destinatarul și vezi scrisoarea în dreapta, în timp real. Copiezi codul HTML sau exporți PDF (în fereastra de tipărire alegi „Salvează ca PDF”)."
    />
  );
}
