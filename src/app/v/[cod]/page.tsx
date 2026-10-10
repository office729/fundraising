import { eq, sql } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";

import { obtineIpClient, verificaLimitaRata } from "@/lib/auth/rate-limit";
import { db } from "@/lib/db";
import { certificateVerificari } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

// Pagina publică la care duce codul QR de pe un certificat: confirmă că certificatul a fost emis de organizație și arată ce scrie pe el.
// Fără cont și fără indexare; codul are 10 caractere (≈50 de biți), deci nu se ghicește, iar căutările sunt limitate pe IP.
export const metadata: Metadata = { title: "Verificarea unui certificat", robots: { index: false, follow: false } };

const COD = /^[A-Z0-9]{5}-[A-Z0-9]{5}$/;

async function citeste(cod: string) {
  if (!(await verificaLimitaRata("verifica-certificat", await obtineIpClient(), 60, 10))) return "prea-multe" as const;
  const randuri = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    // Doar coloanele afișate pe certificat; politica publică deschide tabelul, deci `where cod` e singura restricție.
    return tx
      .select({ destinatar: certificateVerificari.destinatar, titlu: certificateVerificari.titlu, data: certificateVerificari.dataEmitere, numar: certificateVerificari.numar, orgNume: certificateVerificari.orgNume, orgSlug: certificateVerificari.orgSlug, revocat: certificateVerificari.revocat })
      .from(certificateVerificari)
      .where(eq(certificateVerificari.cod, cod))
      .limit(1);
  });
  return randuri[0] ?? null;
}

const dataRo = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Bucharest" });

export default async function VerificareCertificat({ params }: { params: Promise<{ cod: string }> }) {
  const { cod: codBrut } = await params;
  const cod = decodeURIComponent(codBrut).toUpperCase();
  const rezultat = COD.test(cod) ? await citeste(cod) : null;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://alexandrit.ro").replace(/\/$/, "");
  const pagina = `${siteUrl}/v/${cod}`;

  if (rezultat === "prea-multe") {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-xl font-bold text-ink">Prea multe încercări</h1>
        <p className="mt-2 text-[14.5px] text-body">Așteaptă câteva minute și încearcă din nou.</p>
      </main>
    );
  }
  if (!rezultat) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-xl font-bold text-ink">Nu am găsit acest certificat</h1>
        <p className="mt-2 text-[14.5px] leading-relaxed text-body">Codul nu corespunde niciunui certificat emis prin platformă. Verifică dacă l-ai scris exact (are forma <span className="font-mono">ABCDE-FGHJK</span>) sau cere organizației care l-a emis o confirmare.</p>
      </main>
    );
  }

  const an = rezultat.data.slice(0, 4);
  const luna = String(Number(rezultat.data.slice(5, 7)));
  const linkedinPost = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pagina)}`;
  const linkedinProfil = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(rezultat.titlu)}&organizationName=${encodeURIComponent(rezultat.orgNume)}&issueYear=${an}&issueMonth=${luna}&certUrl=${encodeURIComponent(pagina)}${rezultat.numar ? `&certId=${encodeURIComponent(rezultat.numar)}` : ""}`;

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-10">
      <div className="rounded-2xl border border-line bg-panel p-6 shadow-sm">
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[13px] font-bold ${rezultat.revocat ? "bg-red-50 text-red-700" : "bg-brand-green-soft text-brand-green"}`}>
          {rezultat.revocat ? "Certificat retras" : "Certificat autentic"}
        </span>
        <h1 className="font-display mt-4 text-2xl font-bold text-ink">{rezultat.titlu}</h1>
        <dl className="mt-4 space-y-3 text-[14.5px]">
          <div>
            <dt className="text-[12px] font-semibold tracking-wide text-muted-2 uppercase">Acordat</dt>
            <dd className="text-lg font-semibold text-ink">{rezultat.destinatar}</dd>
          </div>
          <div>
            <dt className="text-[12px] font-semibold tracking-wide text-muted-2 uppercase">Emis de</dt>
            <dd className="text-ink">{rezultat.orgNume}</dd>
          </div>
          <div className="flex gap-8">
            <div>
              <dt className="text-[12px] font-semibold tracking-wide text-muted-2 uppercase">Data</dt>
              <dd className="text-ink">{dataRo(rezultat.data)}</dd>
            </div>
            {rezultat.numar && (
              <div>
                <dt className="text-[12px] font-semibold tracking-wide text-muted-2 uppercase">Număr</dt>
                <dd className="text-ink">{rezultat.numar}</dd>
              </div>
            )}
            <div>
              <dt className="text-[12px] font-semibold tracking-wide text-muted-2 uppercase">Cod</dt>
              <dd className="font-mono text-ink">{cod}</dd>
            </div>
          </div>
        </dl>
        <p className="mt-4 text-[12.5px] leading-relaxed text-muted">Certificatul e un gest de recunoaștere al organizației, fără valoare fiscală sau oficială. Pagina arată doar ce scrie pe certificat.</p>
        {!rezultat.revocat && (
          <div className="mt-5 flex flex-wrap gap-2">
            <a href={linkedinPost} target="_blank" rel="noopener noreferrer" className="rounded-md bg-[#0a66c2] px-4 py-2 text-[13.5px] font-bold text-white transition hover:opacity-90">
              Distribuie pe LinkedIn
            </a>
            <a href={linkedinProfil} target="_blank" rel="noopener noreferrer" className="rounded-md border border-line px-4 py-2 text-[13.5px] font-bold text-ink transition hover:border-brand-blue">
              Adaugă în profilul LinkedIn
            </a>
          </div>
        )}
      </div>
      <p className="mt-5 text-center text-[13.5px] text-body">
        Vrei să susții și tu munca organizației?{" "}
        <Link href={`/strangere-fonduri/${rezultat.orgSlug}`} className="font-semibold text-brand-blue underline">
          Vezi campaniile {rezultat.orgNume}
        </Link>
      </p>
    </main>
  );
}
