"use client";

import { BarChart3, Users, UsersRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { FormularInteres } from "@/components/interes/formular-interes";
import { Cristal, Eticheta } from "@/components/interes/ilustratie";

// Pagina /descopera: același mesaj ca pop-up-ul de pe site, într-o singură coloană (sus mesajul și ilustrația, jos formularul).
export function LandingInteres() {
  const [trimis, setTrimis] = useState(false);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#e9eff8] px-3 py-6 sm:px-6 sm:py-12">
      <div className="w-full max-w-[900px] overflow-hidden rounded-[24px] bg-white shadow-[0_30px_80px_rgba(0,30,80,.25)]">
        {/* Sus: mesajul și ilustrația */}
        <section className="relative overflow-hidden bg-[linear-gradient(160deg,#00407a_0%,#001f4d_55%,#001231_100%)] px-6 pt-8 pb-8 text-white sm:px-10 sm:pt-10">
          <div className="grid items-center gap-6 md:grid-cols-[1.05fr_.95fr]">
            <div>
              <Image src="/alexandrit-logo-alb.png" alt="Alexandrit" width={1730} height={332} className="h-auto w-[200px] sm:w-[240px]" priority />
              <h1 className="font-display mt-7 text-[40px] leading-[1.02] font-extrabold tracking-tight sm:text-[56px]">
                Mai mult timp
                <br />
                pentru <span className="text-[#2de2a8]">tine.</span>
              </h1>
              <p className="mt-4 text-[19px] leading-snug text-white/90 sm:text-[23px]">
                Donatorii, campaniile și echipa.
                <br />
                Într-un singur loc.
              </p>
            </div>

            <div className="relative mx-auto h-[250px] w-full max-w-[420px] sm:h-[270px]" aria-hidden>
              <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(40,200,255,.35)_0%,rgba(0,100,220,.12)_45%,transparent_70%)]" />
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 420 260" fill="none" preserveAspectRatio="xMidYMid meet">
                <ellipse cx="210" cy="140" rx="190" ry="78" stroke="rgba(120,220,255,.45)" strokeWidth="1.2" transform="rotate(-8 210 140)" />
                <circle cx="372" cy="104" r="3.5" fill="#bdf3ff" />
                <circle cx="60" cy="150" r="2.5" fill="#bdf3ff" />
              </svg>
              <div className="absolute top-1/2 left-1/2 h-[210px] w-[185px] -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_0_30px_rgba(60,220,255,.55)] sm:h-[230px] sm:w-[200px]">
                <Cristal />
              </div>
              <Eticheta icon={Users} text="Donatori" className="top-0 left-0" />
              <Eticheta icon={BarChart3} text="Campanii" className="top-[92px] right-0" />
              <Eticheta icon={UsersRound} text="Echipă" className="bottom-1 left-2" />
            </div>
          </div>
        </section>

        {/* Jos: formularul */}
        <section className="px-6 pt-8 pb-7 text-[#0b1f4d] sm:px-10 sm:pt-10">
          {trimis ? (
            <div role="status" className="flex min-h-[320px] flex-col items-start justify-center">
              <p className="text-xs font-bold tracking-[.18em] uppercase">Mulțumim</p>
              <h2 className="font-display mt-3 text-[36px] leading-tight font-extrabold sm:text-[46px]">
                Am primit datele tale<span className="text-[#06a87b]">.</span>
              </h2>
              <p className="mt-3 max-w-md text-[18px] text-[#0b1f4d]/80">Te vom contacta în curând.</p>
              <Link href="/" className="mt-6 inline-flex h-12 items-center rounded-xl bg-[#06a87b] px-6 text-[16px] font-bold text-white hover:bg-[#058f69]">
                Vezi alexandrit.ro
              </Link>
            </div>
          ) : (
            <>
              <p className="text-[12px] font-bold tracking-[.2em] uppercase sm:text-[13px]">Pentru organizații care fac bine</p>
              <h2 className="font-display mt-3 text-[36px] leading-none font-extrabold tracking-tight sm:text-[54px]">
                Descoperă Alexandrit<span className="text-[#06a87b]">.</span>
              </h2>
              <p className="mt-3 mb-6 text-[18px] text-[#0b1f4d]/85 sm:text-[22px]">Lasă-ne datele tale și te vom contacta.</p>
              <FormularInteres cale="/descopera" onTrimis={() => setTrimis(true)} nota={false} />
              <div className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
                <p className="text-[18px] font-bold">alexandrit.ro</p>
                <p className="text-[15px] text-[#0b1f4d]/65">Fă primul pas spre un ONG mai bine organizat.</p>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
