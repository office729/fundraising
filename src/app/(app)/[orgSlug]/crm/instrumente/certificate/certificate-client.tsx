"use client";

import { useMemo } from "react";

import { curataDateCertificat, dateCertificatExemplu, dateCertificatGoale, MODELE_CERTIFICATE, MODELE_PORTRET, TIPURI_CERTIFICAT, type DateCertificat } from "@/lib/certificate";
import { randeazaCertificat } from "@/lib/certificate-modele";
import { paletaDinHex } from "@/lib/raport-impact-culori";
import type { InfoOrganizatie } from "@/lib/scrisori";

import { GalerieSabloane } from "../_comun/galerie-sabloane";
import { GeneratorDocument, type GrupDef } from "../_comun/generator-document";

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
      coloane="grid-cols-1 items-start sm:grid-cols-2 lg:grid-cols-3"
    />
  );
}

const GRUPURI: GrupDef[] = [
  {
    titlu: "Cui se acordă",
    campuri: [
      { cheie: "destinatar", eticheta: "Numele persoanei sau al companiei", placeholder: "ex. Exemplu Construct SRL" },
      { cheie: "detaliu", eticheta: "Detaliu (opțional)", placeholder: "ex. Suma susținută: 5.000 lei / 120 de ore de voluntariat" },
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
      { cheie: "nrCertificat", eticheta: "Număr certificat (opțional)", placeholder: "ex. Nr. 014 / 2026" },
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
  { titlu: "Organizația", campuri: [{ cheie: "antetNume", eticheta: "Numele organizației (apare în sigiliu)" }] },
];

export function GeneratorCertificate({ orgSlug, org, azi, model }: { orgSlug: string; org: InfoOrganizatie; azi: string; model?: string }) {
  const initial = useMemo<DateCertificat>(() => {
    const d = dateCertificatGoale({ nume: org.nume, logo: org.logo, acc: accenteOrg(org) }, azi);
    return MODELE_CERTIFICATE.some((m) => m.id === model) ? { ...d, model: model as DateCertificat["model"] } : d;
  }, [org, azi, model]);
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
      ajutor="Alegi șablonul și tipul certificatului, scrii numele destinatarului și vezi certificatul în dreapta, în timp real. Copiezi codul HTML sau exporți PDF (în fereastra de tipărire alegi „Salvează ca PDF”)."
    />
  );
}
