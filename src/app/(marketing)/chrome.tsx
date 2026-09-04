"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
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
          <a href="mailto:vlad.placinta@fundrasingacademy.ro" className="font-medium text-white hover:underline">
            vlad.placinta@fundrasingacademy.ro
          </a>{" "}
          · <a href="tel:0752753540" className="font-medium text-white hover:underline">0752 753 540</a>
        </span>
        <div className="flex items-center gap-4">
          <Link href="/studii-de-caz" className="hover:text-white">
            {dict.topbar.caseStudies}
          </Link>
          <Link href="/blog" className="hover:text-white">
            {dict.topbar.blog}
          </Link>
          <a href="mailto:vlad.placinta@fundrasingacademy.ro" className="hover:text-white">
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
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5" onClick={() => setDeschis(false)}>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-blue font-display text-base font-extrabold text-white">
            FA
          </span>
          <span className="font-display text-base leading-tight font-bold text-brand-blue">
            Fundraising
            <br />
            Academy
          </span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {dict.nav.map((item) => {
            const activ = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition ${
                  activ ? "border-b-2 border-brand-green text-brand-green" : "text-ink hover:text-brand-green"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/hub#consultanta"
            className="hidden rounded-md bg-brand-green px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-green-hover sm:inline-block"
          >
            {dict.header.consulting}
          </Link>
          <Link
            href="/login"
            className="hidden rounded-md border border-line px-4 py-2 text-sm font-bold text-ink transition hover:border-brand-blue hover:text-brand-blue lg:inline-block"
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
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setDeschis(false)}
              className={`rounded-lg px-2 py-2 text-sm font-medium ${
                pathname === item.href ? "bg-brand-green-soft text-brand-green" : "text-ink hover:bg-panel-2"
              }`}
            >
              {item.label}
            </Link>
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

export function CtaBand({ dict }: { dict: MarketingDict }) {
  return (
    <section className="bg-panel-2 px-[6%] py-16 text-center">
      <h2 className="font-display mb-3 text-[28px] font-bold text-ink">{dict.ctaBand.title}</h2>
      <p className="mx-auto mb-6 max-w-xl text-base leading-relaxed text-muted">{dict.ctaBand.desc}</p>
      <a
        href="mailto:vlad.placinta@fundrasingacademy.ro"
        className="inline-block rounded-md bg-brand-green px-7 py-3.5 font-bold text-white transition hover:bg-brand-green-hover"
      >
        {dict.ctaBand.cta}
      </a>
      <p className="mx-auto mt-6 max-w-xl text-[13px] leading-relaxed text-muted-2">{dict.ctaBand.footnote}</p>
    </section>
  );
}

export function SiteFooter({ dict }: { dict: MarketingDict }) {
  return (
    <footer className="bg-[#1a2332] px-[6%] py-14 text-white">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 sm:grid-cols-3">
        <div>
          <p className="font-display text-base font-bold">Fundraising Academy</p>
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
            <a href="mailto:vlad.placinta@fundrasingacademy.ro" className="mt-2 text-sm text-white/75 hover:text-white">
              vlad.placinta@fundrasingacademy.ro
            </a>
            <span className="text-sm text-white/75">0752 753 540 · {dict.footer.location}</span>
          </div>
        </div>
      </div>
      <p className="mx-auto mt-10 max-w-6xl text-xs text-white/40">© 2026 fundrasingacademy.ro</p>
    </footer>
  );
}
