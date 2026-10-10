"use client";

import { useMemo } from "react";

import { curataDateCertificat, dateCertificatExemplu, dateCertificatGoale, MODELE_CERTIFICATE, MODELE_PORTRET, TIPURI_CERTIFICAT, type DateCertificat } from "@/lib/certificate";
import { randeazaCertificat } from "@/lib/certificate-modele";
import { MOTIVE } from "@/lib/motiv";
import { paletaDinHex } from "@/lib/raport-impact-culori";
import type { InfoOrganizatie } from "@/lib/scrisori";

import { GalerieSabloane } from "../_comun/galerie-sabloane";
import { asiguraVerificareAction } from "../_comun/documente-actions";
import { GeneratorDocument, type Banner, type GrupDef } from "../_comun/generator-document";

const accenteOrg = (o: InfoOrganizatie) => {
  const p = o.culoare ? paletaDinHex(o.culoare) : null;
  return p ? { accent: p.accent, accent2: p.accent2, accent3: p.accent3 } : undefined;
};

export function GalerieCertificate({ orgSlug, org, azi }: { orgSlug: string; org: InfoOrganizatie; azi: string }) {
  const modele = useMemo(() => {
    const ex = dateCertificatExemplu({ nume: org.nume, logo: org.logo, acc: accenteOrg(org) }, azi);
    return MODELE_CERTIFICATE.map((m) => ({ id: m.id, eticheta: m.eticheta, hint: m.hint, html: randeazaCertificat(ex, m.id), ...(MODELE_PORTRET.includes(m.id) ? { lat: 794, inalt: 1123 } : {}) }));
  }, [org, azi]);
  return (
    <GalerieSabloane
      titlu="Certificate: alege un șablon"
      subtitlu={`${MODELE_CERTIFICATE.length} modele de certificat, cu date de exemplu. Apasă pe unul ca să-l completezi.`}
      hrefGenerator={`/${orgSlug}/crm/instrumente/certificate/generator`}
      modele={modele}
      lat={1123}
      inalt={794}
      coloane="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
      recomandate={["clasic", "modern", "gala", "inima", "puls", "diploma"]}
    />
  );
}

const GRUPURI: GrupDef[] = [
  {
    titlu: "Cui se acordă",
    campuri: [
      { cheie: "destinatar", eticheta: "Numele persoanei sau al companiei", placeholder: "ex. Exemplu Construct SRL" },
      { cheie: "detaliu", eticheta: "Detaliu (opțional)", placeholder: "ex. 4 proiecte susținute în 2025–2026", ajutor: "Nu publica sume date de persoane fizice fără acordul lor." },
    ],
  },
  {
    titlu: "Textul certificatului",
    campuri: [
      { cheie: "titlu", eticheta: "Titlul" },
      { cheie: "introducere", eticheta: "Formula de acordare", placeholder: "ex. se acordă cu mulțumire" },
      { cheie: "motiv", eticheta: "Motivul", tip: "textarea", rows: 4, ajutor: "Se completează automat: {DESTINATAR}, {ORGANIZATIE}, {DATA}." },
      { cheie: "citat", eticheta: "Citat sau mesaj scurt (opțional)" },
    ],
  },
  {
    titlu: "Data și numărul",
    campuri: [
      { cheie: "loc", eticheta: "Localitatea", jumatate: true },
      { cheie: "data", eticheta: "Data", tip: "data", jumatate: true },
      { cheie: "nrCertificat", eticheta: "Număr certificat (opțional)", placeholder: "ex. Nr. 014/2026" },
    ],
  },
  {
    titlu: "Semnături",
    campuri: [
      { cheie: "semn1Nume", eticheta: "Primul semnatar", jumatate: true },
      { cheie: "semn1Functie", eticheta: "Funcția", jumatate: true },
      { cheie: "semn2Nume", eticheta: "Al doilea semnatar (opțional)", jumatate: true },
      { cheie: "semn2Functie", eticheta: "Funcția", jumatate: true },
    ],
  },
  {
    titlu: "Verificare online",
    subtitlu: "Pe certificat apar un cod QR și adresa unei pagini publice care confirmă că a fost emis de organizație.",
    campuri: [{ cheie: "verificareOnline", eticheta: "Verificare online", tip: "bifa", placeholder: "Cod de verificare și pagină publică (arată numele destinatarului, titlul, data, numărul și emitentul)", ajutor: "Debifează dacă numele destinatarului nu trebuie să fie public, de exemplu la un voluntar. Pagina oferă și butoane de distribuire pe LinkedIn." }],
  },
  { titlu: "Organizația", campuri: [{ cheie: "antetNume", eticheta: "Numele organizației (apare în sigiliu)" }, { cheie: "motivGrafic", eticheta: "Motiv grafic", tip: "select", optiuni: MOTIVE, ajutor: "Ce apare în centrul sigiliului și în decor." }] },
];

const PERSONALE = ["destinatar", "detaliu", "citat", "logoDestinatar", "nrCertificat", "semn1Nume", "semn1Functie", "semn2Nume", "semn2Functie"];

export function GeneratorCertificate({ orgSlug, org, azi, model, semnatar, dateIni, firmaId, bannere, siteUrl }: { siteUrl: string; orgSlug: string; org: InfoOrganizatie; azi: string; model?: string; semnatar: { nume: string; functie: string }; dateIni?: Record<string, unknown>; firmaId: string | null; bannere: Banner[] }) {
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
      titlu="Certificat"
      galerieHref={`/${orgSlug}/crm/instrumente/certificate`}
      modele={MODELE_CERTIFICATE}
      date={initial}
      curata={(b) => curataDateCertificat(b, azi)}
      randeaza={randeazaCertificat}
      grupuri={GRUPURI}
      tipuri={{ cheie: "tip", eticheta: "Tipul certificatului", optiuni: TIPURI_CERTIFICAT.map((t) => ({ id: t.id, eticheta: t.eticheta, patch: { titlu: t.titlu, introducere: t.introducere, motiv: t.motiv } })) }}
      logoOng={{ cheie: "logoOng", implicit: org.logo }}
      logoDestinatar={{ cheie: "logoDestinatar", eticheta: "Logo destinatar (opțional)" }}
      culoareOrganizatie={org.culoare}
      numeFisier={(d) => `certificat-${d.destinatar || "document"}`}
      titluIstoric={(d) => `${d.titlu || "Certificat"} — ${d.destinatar || "fără destinatar"}`}
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
      ajutor="Alegi șablonul și tipul certificatului, scrii numele destinatarului și vezi certificatul în dreapta, în timp real. „Salvează ca PDF” descarcă direct fișierul. Certificatul e un gest de recunoaștere, nu un document oficial. La export primește un cod QR și o pagină publică de verificare."
    />
  );
}
