"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";

import { descompune, starePrelansare, tintaCronometru } from "@/lib/prelansare";

// O singură sursă de timp pentru toată pagina: un tic pe secundă. Pe server (și la prima randare din browser) valoarea e null, deci se afișează liniuțe, fără
// nepotrivire la hidratare; imediat după încărcare apar cifrele reale.
function aboneaza(cb: () => void) {
  const id = window.setInterval(cb, 1000);
  return () => window.clearInterval(id);
}
const secunda = () => Math.floor(Date.now() / 1000);
const pe2 = (n: number) => String(n).padStart(2, "0");

function Casuta({ valoare, eticheta }: { valoare: string; eticheta: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center rounded-2xl border border-white/15 bg-white/[0.07] px-2 py-4 shadow-[0_8px_32px_rgba(0,0,0,0.25)] backdrop-blur-md sm:py-6">
      <span className="font-display text-[34px] leading-none font-extrabold tracking-tight text-white tabular-nums sm:text-[64px]">{valoare}</span>
      <span className="mt-2 text-[11px] font-semibold tracking-[0.18em] text-white/70 uppercase sm:text-[12.5px]">{eticheta}</span>
    </div>
  );
}

export function Cronometru({ oprit }: { oprit: boolean }) {
  const sec = useSyncExternalStore(aboneaza, secunda, () => null);
  const acum = sec === null ? null : sec * 1000;
  const stare = acum === null ? "numaratoare" : starePrelansare(acum, oprit);
  const timp = acum === null ? null : descompune(tintaCronometru(stare) - acum);

  // La ora lansării, pagina se reîncarcă singură și arată site-ul.
  useEffect(() => {
    if (acum !== null && stare === "live") window.location.reload();
  }, [acum, stare]);

  const ajun = stare === "ajun";
  return (
    <section className="relative z-10 mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-5 py-14 text-center text-white">
      {/* eslint-disable-next-line @next/next/no-img-element -- sigla albă, fișier static mic; pagina e un ecran de așteptare */}
      <img src="/alexandrit-logo-alb.png" alt="Alexandrit" width={1730} height={332} className="h-9 w-auto sm:h-11" />

      <p className="mt-8 inline-flex items-center gap-2 rounded-full border border-[#3fa85c]/50 bg-[#3fa85c]/15 px-4 py-1.5 text-[12.5px] font-bold tracking-wide text-[#a8e8bb] uppercase sm:text-[13px]">
        <span className="h-2 w-2 rounded-full bg-[#3fa85c] motion-safe:animate-pulse" aria-hidden="true" />
        Lansare 26 octombrie 2026
      </p>

      <h1 className="font-display mt-5 max-w-3xl text-[32px] leading-[1.1] font-extrabold text-balance sm:text-[56px]">
        {ajun ? "Mâine suntem live" : "Platforma ONG-urilor se deschide în curând"}
      </h1>
      <p className="mt-4 max-w-2xl text-[15.5px] leading-relaxed text-white/80 sm:text-[18px]">
        Donatori, companii, campanii, granturi, voluntari și reclame, într-un singur loc. Ultimele detalii sunt în lucru, iar de pe 26 octombrie site-ul se deschide pentru toată lumea.
      </p>

      <div role="timer" aria-label={ajun ? "Timp rămas până la deschiderea pentru toți" : "Timp rămas până la lansare"} className="mt-9 flex w-full max-w-2xl gap-2.5 sm:gap-4">
        <Casuta valoare={timp ? pe2(timp.zile) : "––"} eticheta="Zile" />
        <Casuta valoare={timp ? pe2(timp.ore) : "––"} eticheta="Ore" />
        <Casuta valoare={timp ? pe2(timp.minute) : "––"} eticheta="Minute" />
        <Casuta valoare={timp ? pe2(timp.secunde) : "––"} eticheta="Secunde" />
      </div>
      <p className="mt-4 text-[13px] text-white/60">
        {ajun ? "Deschiderea pentru toți: 26 octombrie 2026, ora 00:00 (ora României)" : "Cronometrul se oprește pe 25 octombrie 2026, ora 00:00 (ora României)"}
      </p>

      <div className="mt-10 w-full max-w-2xl rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-4 text-[14px] leading-relaxed text-white/80 backdrop-blur-sm">
        Până atunci, accesul la site e rezervat echipei Alexandrit. <strong className="text-white">Organizațiile care folosesc deja platforma</strong> își pot deschide contul și paginile de donație ca până acum.
        <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
          <Link prefetch={false} href="/intra" className="rounded-lg bg-[#3fa85c] px-5 py-2.5 text-[14px] font-bold text-white transition hover:bg-[#349850] focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none">
            Intră în cont
          </Link>
          <Link prefetch={false} href="/contact" className="rounded-lg border border-white/30 px-5 py-2.5 text-[14px] font-bold text-white transition hover:border-white focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none">
            Scrie-ne
          </Link>
        </div>
      </div>

      <nav aria-label="Informații legale" className="mt-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[12.5px] text-white/55">
        <Link prefetch={false} href="/termeni" className="hover:text-white">
          Termeni și condiții
        </Link>
        <Link prefetch={false} href="/gdpr" className="hover:text-white">
          Politica de confidențialitate
        </Link>
        <Link prefetch={false} href="/cookies" className="hover:text-white">
          Cookies
        </Link>
      </nav>
    </section>
  );
}
