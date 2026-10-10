"use client";

import { useMemo } from "react";

import { antetDinOrganizatie, campuriNecompletate, curataDateScrisoare, dateScrisoareExemplu, dateScrisoareGoale, MECANISME_SCRISOARE, MODELE_SCRISORI, TIPURI_SCRISOARE, type DateScrisoare, type InfoOrganizatie } from "@/lib/scrisori";
import { MOTIVE } from "@/lib/motiv";
import { randeazaScrisoare } from "@/lib/scrisori-modele";
import { paletaDinHex } from "@/lib/raport-impact-culori";

import { GalerieSabloane } from "../_comun/galerie-sabloane";
import { GeneratorDocument, type Banner, type GrupDef } from "../_comun/generator-document";

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
      recomandate={["clasic", "modern", "minimal", "elegant", "corporate"].filter((id) => MODELE_SCRISORI.some((m) => m.id === id))}
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
      { cheie: "nrInregistrare", eticheta: "Număr de înregistrare", placeholder: "ex. Nr. 014/2026" },
      { cheie: "subiect", eticheta: "Subiect" },
      { cheie: "formulaAdresare", eticheta: "Formula de adresare" },
      { cheie: "corp", eticheta: "Textul scrisorii", tip: "textarea", rows: 11, ajutor: "Paragrafele se despart printr-un rând liber. Se completează automat: {DESTINATAR}, {FIRMA}, {ORGANIZATIE}, {DATA}, {SUMA}, {PROIECT}, {AN}." },
      { cheie: "formulaFinala", eticheta: "Formula de încheiere" },
    ],
  },
  {
    titlu: "Cerere și termen",
    subtitlu: "Folosite în {SUMA_CERUTA}, {REZULTAT}, {TERMEN} și {PARAGRAF_FISCAL}, în scrisorile de solicitare, ofertă, follow-up și reînnoire.",
    campuri: [
      { cheie: "sumaCeruta", eticheta: "Suma propusă", placeholder: "ex. 12.000 lei", jumatate: true },
      { cheie: "termen", eticheta: "Termen sau moment", placeholder: "ex. marți, între 10 și 12", jumatate: true },
      { cheie: "rezultat", eticheta: "Ce se obține cu suma", placeholder: "ex. examinarea la timp a 40 de copii" },
      { cheie: "mecanism", eticheta: "Mecanism fiscal (opțional)", tip: "select", optiuni: MECANISME_SCRISOARE, ajutor: "Adaugă un paragraf prudent despre mecanism, fără cifre sau termene. Verific-o cu contabilul înainte să trimiți." },
    ],
  },
  {
    titlu: "Date pentru text",
    subtitlu: "Folosite în {SUMA}, {PROIECT} și {AN}. Se completează singure când pornești din fișa unei firme.",
    campuri: [
      { cheie: "suma", eticheta: "Suma", placeholder: "ex. 5.000 lei", jumatate: true },
      { cheie: "an", eticheta: "Anul", placeholder: "ex. 2026", jumatate: true },
      { cheie: "proiect", eticheta: "Proiectul" },
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
      { cheie: "motivGrafic", eticheta: "Motiv grafic", tip: "select", optiuni: MOTIVE, ajutor: "Apare discret în unele modele (filigran, linie sub antet)." },
      { cheie: "antetLinii", eticheta: "Adresă, CIF, IBAN, contact", tip: "textarea", rows: 3, ajutor: "Câte un rând pentru fiecare informație. Poți adăuga și mențiuni utile firmelor: statutul de utilitate publică sau numărul din registrul entităților pentru care se acordă deduceri fiscale, dacă organizația îl are." },
    ],
  },
];

const PERSONALE = ["sumaCeruta", "rezultat", "termen", "destNume", "destFunctie", "destFirma", "destAdresa", "logoDestinatar", "nrInregistrare", "semnNume", "semnFunctie", "ps", "anexe", "suma", "proiect", "an"];

export function GeneratorScrisori({ orgSlug, org, azi, model, semnatar, dateIni, firmaId, bannere }: { orgSlug: string; org: InfoOrganizatie; azi: string; model?: string; semnatar: { nume: string; functie: string }; dateIni?: Record<string, unknown>; firmaId: string | null; bannere: Banner[] }) {
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
      titluIstoric={(d) => `${d.subiect || "Scrisoare"} — ${d.destFirma || d.destNume || "fără destinatar"}`}
      numerotare={{ cheie: "nrInregistrare" }}
      campuriPersonale={PERSONALE}
      modelDinUrl={modelValid}
      datePregatite={!!dateIni}
      firmaId={firmaId}
      bannere={bannere}
      avertizare={(d) => {
        const lipsa = campuriNecompletate(d);
        if (lipsa.length) return `Completează în text: ${lipsa.join(", ")}. Altfel rămân vizibile în scrisoare.`;
        return d.corp.length > 2400 ? "Textul e lung: scrisoarea se întinde pe mai multe pagini A4." : null;
      }}
      ajutor="Alegi șablonul și tipul scrisorii, completezi destinatarul și vezi scrisoarea în dreapta, în timp real. „Salvează ca PDF” descarcă direct fișierul. Modelele sunt orientative: citește și adaptează textul înainte să-l trimiți."
    />
  );
}
