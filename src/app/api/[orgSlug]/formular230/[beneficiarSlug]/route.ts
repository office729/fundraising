import { randomUUID } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { obtineIpClient, verificaLimitaRata } from "@/lib/auth/rate-limit";
import { db } from "@/lib/db";
import { raporteazaEroare } from "@/lib/monitoring";
import { formular230Beneficiari, formular230Submissions, organizations } from "@/lib/db/schema";
import { cripteaza } from "@/lib/secret-box";
import { EMAIL_RE } from "@/lib/validation";

// Ruta de PRIMIRE a Formularului 230 — trebuie să fie accesibilă unui
// vizitator NEautentificat (link distribuit public), deci NU trece prin
// withOrgSession. org_id + beneficiar_id se rezolvă server-side din slug-uri
// (organizations_public_lookup / formular230_beneficiari_public_lookup, vezi
// scripts/restore-rls.mjs), niciodată direct de la client.
// Citirea (statistica din CRM) rămâne autentificată — vezi
// src/app/(app)/[orgSlug]/crm/donatori/formular-230/page.tsx (Server Component,
// withOrgSession direct, fără rută API separată).

const CNP_RE = /^\d{13}$/;
const MAX_FIELD_LEN = 200; // orice câmp de adresă/nume rezonabil e mult sub asta
const MAX_SEMNATURA_LEN = 500_000; // ~370 KB de PNG în base64 — o semnătură reală are câteva zeci de KB

type Ctx = { params: Promise<{ orgSlug: string; beneficiarSlug: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const { orgSlug, beneficiarSlug } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // Fiecare cerere validă scrie un rând cu date personale + o semnătură; fără
  // limită, un bot umple baza (plan gratuit) și inboxul organizației. 20/oră/IP
  // permite unei familii sau unui birou să completeze mai multe formulare.
  if (!(await verificaLimitaRata("formular230", await obtineIpClient(), 20, 60))) {
    return NextResponse.json({ error: "prea_multe_cereri" }, { status: 429 });
  }

  // Honeypot — câmp invizibil pentru oameni; dacă e completat, e un bot.
  // Răspundem "succes" ca să nu semnalăm detectarea, dar nu scriem nimic.
  if (typeof body.website === "string" && body.website.trim()) {
    return NextResponse.json({ ok: true });
  }

  const str = (k: string) => (typeof body[k] === "string" ? (body[k] as string).trim() : "");
  const TEXT_FIELDS = [
    "nume", "prenume", "initialaTatalui", "email", "telefon", "strada", "numar",
    "judet", "localitate", "codPostal", "bloc", "scara", "etaj", "apartament",
  ] as const;
  if (TEXT_FIELDS.some((k) => str(k).length > MAX_FIELD_LEN)) {
    return NextResponse.json({ error: "camp_prea_lung" }, { status: 400 });
  }

  const nume = str("nume");
  const prenume = str("prenume");
  const cnp = str("cnp");
  const email = str("email");

  if (!nume || !prenume || !cnp || !email) {
    return NextResponse.json({ error: "campuri_obligatorii_lipsa" }, { status: 400 });
  }
  if (!CNP_RE.test(cnp)) {
    return NextResponse.json({ error: "cnp_invalid" }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "email_invalid" }, { status: 400 });
  }
  if (body.consimtamant !== true || body.termeni !== true) {
    return NextResponse.json({ error: "acord_necesar" }, { status: 400 });
  }
  const semnatura = typeof body.semnatura === "string" ? body.semnatura : "";
  if (!semnatura.startsWith("data:image/png;base64,")) {
    return NextResponse.json({ error: "semnatura_lipsa" }, { status: 400 });
  }
  if (semnatura.length > MAX_SEMNATURA_LEN) {
    return NextResponse.json({ error: "semnatura_prea_mare" }, { status: 400 });
  }

  const id = randomUUID();
  // Fixat aici, o singură dată — nu recalculat la fiecare descărcare a PDF-ului
  // (vezi comentariul pe coloana `an` din schema formular230Submissions).
  const an = new Date().getFullYear();

  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
      const org = await tx
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.slug, orgSlug))
        .limit(1);
      if (!org[0]) throw new Error("org_not_found");

      const beneficiar = await tx
        .select({ id: formular230Beneficiari.id })
        .from(formular230Beneficiari)
        .where(and(eq(formular230Beneficiari.orgId, org[0].id), eq(formular230Beneficiari.slug, beneficiarSlug)))
        .limit(1);
      if (!beneficiar[0]) throw new Error("beneficiar_not_found");

      await tx.insert(formular230Submissions).values({
        id,
        orgId: org[0].id,
        beneficiarId: beneficiar[0].id,
        nume,
        prenume,
        initialaTatalui: str("initialaTatalui"),
        // CNP e date sensibile (identificator național unic) — se validează în
        // clar mai sus, dar se stochează criptat (AES-256-GCM, vezi
        // lib/secret-box.ts). Decriptarea are loc o singură dată, la citire, în
        // pagina de statistici CRM (page.tsx din acest modul).
        cnp: cripteaza(cnp),
        email,
        telefon: str("telefon"),
        strada: str("strada"),
        numar: str("numar"),
        judet: str("judet"),
        localitate: str("localitate"),
        codPostal: str("codPostal"),
        bloc: str("bloc"),
        scara: str("scara"),
        etaj: str("etaj"),
        apartament: str("apartament"),
        distributie2Ani: body.distributie2Ani === true,
        consimtamant: true,
        termeni: true,
        semnatura,
        an,
      });
    });
  } catch (e) {
    if (e instanceof Error && e.message === "org_not_found") {
      return NextResponse.json({ error: "org_not_found" }, { status: 404 });
    }
    if (e instanceof Error && e.message === "beneficiar_not_found") {
      return NextResponse.json({ error: "beneficiar_not_found" }, { status: 404 });
    }
    raporteazaEroare("formular230-insert", e, { orgSlug });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id, an });
}
