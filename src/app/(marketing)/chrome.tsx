"use client";

import { ChevronDown, Menu, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { LanguageSwitcher } from "@/components/language-switcher";
import type { Locale } from "@/lib/i18n/config";
import type { MarketingDict } from "@/lib/i18n/dictionaries/marketing";

export function TopBar({ dict, locale }: { dict: MarketingDict; locale: Locale }) {
  return (
    <div className="bg-brand-blue px-[6%] py-2.5 text-xs text-white/80">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
        <span>
          {dict.topbar.help}{" "}
          <a href="mailto:vlad.placinta@alexandrit.ro" className="font-medium text-white hover:underline">
            vlad.placinta@alexandrit.ro
          </a>{" "}
          · <a href="tel:0757401042" className="font-medium text-white hover:underline">0757 401 042</a>
        </span>
        <div className="flex items-center gap-4">
          <Link href="/studii-de-caz" className="hover:text-white">
            {dict.topbar.caseStudies}
          </Link>
          <Link href="/blog" className="hover:text-white">
            {dict.topbar.blog}
          </Link>
          <a href="mailto:vlad.placinta@alexandrit.ro" className="hover:text-white">
            {dict.topbar.contact}
          </a>
          <LanguageSwitcher locale={locale} dark />
        </div>
      </div>
    </div>
  );
}

export function SiteHeader({ dict }: { dict: MarketingDict }) {
  const pathname = usePathname();
  const [deschis, setDeschis] = useState(false);

  return (
    <header className="border-b border-line bg-panel">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-6 px-6">
        <Link href="/" className="flex shrink-0 items-center" onClick={() => setDeschis(false)} aria-label="Alexandrit">
          <Image src="/alexandrit-logo.webp" alt="Alexandrit" width={1730} height={332} priority className="brand-mark h-9 w-auto" />
        </Link>

        <nav className="hidden items-center gap-4 lg:flex xl:gap-6">
          {/* „Acasă" lipsește de aici: logo-ul duce deja la prima pagină (rămâne în meniul de mobil). */}
          {dict.nav.filter((item) => item.href !== "/").map((item) => {
            const subPaginiActive = dict.navCineSuntem.some((x) => pathname === x.href);
            const activ = pathname === item.href || (item.href === "/cine-suntem" && subPaginiActive);
            if (item.href === "/cine-suntem") {
              return (
                <div key={item.href} className="group relative">
                  <Link
                    href={item.href}
                    className={`flex items-center gap-1 text-sm font-medium whitespace-nowrap transition ${
                      activ ? "border-b-2 border-brand-green text-brand-green" : "text-ink group-hover:text-brand-green"
                    }`}
                  >
                    {item.label}
                    <ChevronDown className="h-3.5 w-3.5 transition group-hover:rotate-180" />
                  </Link>
                  <div className="invisible absolute top-full left-1/2 z-30 -translate-x-1/2 pt-3 opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                    <div className="min-w-[220px] rounded-xl border border-line bg-panel p-2 shadow-[0_14px_36px_rgba(21,74,133,0.14)]">
                      {dict.navCineSuntem.map((sub) => (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          className={`block rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition ${
                            pathname === sub.href ? "bg-brand-green-soft text-brand-green" : "text-ink hover:bg-panel-2 hover:text-brand-green"
                          }`}
                        >
                          {sub.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium whitespace-nowrap transition ${
                  activ ? "border-b-2 border-brand-green text-brand-green" : "text-ink hover:text-brand-green"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          <Link
            href="/hub#consultanta"
            className="hidden rounded-md bg-brand-green px-4 py-2 text-sm font-bold whitespace-nowrap text-white transition hover:bg-brand-green-hover sm:inline-block lg:hidden xl:inline-block"
          >
            {dict.header.consulting}
          </Link>
          <Link
            href="/login"
            className="hidden rounded-md border border-line px-3.5 py-2 text-sm font-bold whitespace-nowrap text-ink transition hover:border-brand-blue hover:text-brand-blue lg:inline-block"
          >
            {dict.header.login}
          </Link>
          <button
            type="button"
            onClick={() => setDeschis((v) => !v)}
            aria-label={deschis ? dict.header.closeMenu : dict.header.openMenu}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink lg:hidden"
          >
            {deschis ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {deschis && (
        <nav className="flex flex-col gap-1 border-t border-line px-6 py-3 lg:hidden">
          {dict.nav.map((item) => (
            <div key={item.href} className="flex flex-col gap-1">
              <Link
                href={item.href}
                onClick={() => setDeschis(false)}
                className={`rounded-lg px-2 py-2 text-sm font-medium ${
                  pathname === item.href ? "bg-brand-green-soft text-brand-green" : "text-ink hover:bg-panel-2"
                }`}
              >
                {item.label}
              </Link>
              {item.href === "/cine-suntem" &&
                dict.navCineSuntem.map((sub) => (
                  <Link
                    key={sub.href}
                    href={sub.href}
                    onClick={() => setDeschis(false)}
                    className={`ml-4 rounded-lg px-2 py-1.5 text-[13.5px] font-medium ${
                      pathname === sub.href ? "bg-brand-green-soft text-brand-green" : "text-muted hover:bg-panel-2 hover:text-ink"
                    }`}
                  >
                    {sub.label}
                  </Link>
                ))}
            </div>
          ))}
          <Link
            href="/hub#consultanta"
            onClick={() => setDeschis(false)}
            className="mt-2 rounded-md bg-brand-green px-4 py-2.5 text-center text-sm font-bold text-white"
          >
            {dict.header.consulting}
          </Link>
          <Link
            href="/login"
            onClick={() => setDeschis(false)}
            className="mt-1 rounded-md border border-line px-4 py-2.5 text-center text-sm font-bold text-ink"
          >
            {dict.header.login}
          </Link>
        </nav>
      )}
    </header>
  );
}

export function SiteFooter({ dict }: { dict: MarketingDict }) {
  return (
    <footer className="bg-[#1a2332] px-[6%] py-14 text-white">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 sm:grid-cols-3">
        <div>
          <Image src="/alexandrit-logo-alb.png" alt="Alexandrit" width={1730} height={332} className="h-9 w-auto" />
          <p className="mt-2 text-sm text-white/60">{dict.footer.tagline}</p>
        </div>
        <div>
          <p className="text-xs font-bold tracking-wide text-white/50 uppercase">{dict.footer.navTitle}</p>
          <div className="mt-3 flex flex-col gap-2">
            {dict.footer.nav.map((item) => (
              <Link key={item.label} href={item.href} className="text-sm text-white/75 hover:text-white">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold tracking-wide text-white/50 uppercase">{dict.footer.legalTitle}</p>
          <div className="mt-3 flex flex-col gap-2">
            {/* Draft-uri, marcate vizibil pe fiecare pagină — vezi nota din
                fiecare fișier. Nu sunt text juridic final. */}
            <Link href="/termeni" className="text-sm text-white/75 hover:text-white">
              {dict.footer.terms}
            </Link>
            <Link href="/gdpr" className="text-sm text-white/75 hover:text-white">
              {dict.footer.gdpr}
            </Link>
            <Link href="/cookies" className="text-sm text-white/75 hover:text-white">
              {dict.footer.cookies}
            </Link>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-10 grid max-w-6xl grid-cols-1 gap-8 border-t border-white/10 pt-8 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs font-bold tracking-wide text-white/50 uppercase">{dict.footer.companyTitle}</p>
          <div className="mt-3 flex flex-col gap-1 text-sm text-white/75">
            {dict.footer.company.map((linie) => (
              <span key={linie}>{linie}</span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold tracking-wide text-white/50 uppercase">{dict.footer.contactTitle}</p>
          <div className="mt-3 flex flex-col gap-3 text-sm text-white/75">
            {dict.footer.contact.map((c) => (
              <div key={c.email} className="flex flex-col">
                <span className="text-[12px] text-white/50">
                  {c.nume} · {c.rol}
                </span>
                <a href={`mailto:${c.email}`} className="hover:text-white">
                  {c.email}
                </a>
                <a href={`tel:${c.tel}`} className="hover:text-white">
                  {c.telefon}
                </a>
              </div>
            ))}
          </div>
        </div>
        <div className="lg:col-span-2">
          <p className="text-xs font-bold tracking-wide text-white/50 uppercase">{dict.footer.objectiveTitle}</p>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/75">{dict.footer.objective}</p>
        </div>
      </div>

      <div className="mx-auto mt-8 flex max-w-6xl flex-wrap items-center gap-3 border-t border-white/10 pt-6">
        <span className="text-xs font-bold tracking-wide text-white/50 uppercase">{dict.footer.anpcTitle}</span>
        {dict.footer.anpc.map((l) => (
          <a
            key={l.label}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 rounded-lg border border-white/20 bg-white/5 px-3.5 py-2 transition hover:border-white/50 hover:bg-white/10"
          >
            <ShieldCheck className="h-5 w-5 shrink-0 text-[#9ce2af]" />
            <span className="flex flex-col leading-tight">
              <span className="text-[13px] font-bold text-white">{l.label}</span>
              <span className="text-[11px] text-white/60">{l.sub}</span>
            </span>
          </a>
        ))}
      </div>

      <p className="mx-auto mt-8 max-w-6xl text-xs text-white/40">© 2026 alexandrit.ro · MEDIGROUPPLUS SRL</p>
    </footer>
  );
}
