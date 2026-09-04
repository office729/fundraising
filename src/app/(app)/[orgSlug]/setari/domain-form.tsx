"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import type { Locale } from "@/lib/i18n/config";
import { SETARI_ECHIPA_DICT } from "@/lib/i18n/dictionaries/setari-echipa";
import {
  updateCustomDomainAction,
  updateSlugAction,
  type DomainState,
  type SlugState,
} from "./actions";

const VERCEL_CNAME_TARGET = "cname.vercel-dns.com";

export function DomainForm({
  orgSlug,
  locale,
  initialCustomDomain,
}: {
  orgSlug: string;
  locale: Locale;
  initialCustomDomain: string | null;
}) {
  const dict = SETARI_ECHIPA_DICT[locale].orgSetari.domeniu;
  const router = useRouter();

  const boundSlugAction = updateSlugAction.bind(null, orgSlug);
  const [slugState, slugFormAction, slugPending] = useActionState<SlugState, FormData>(boundSlugAction, {
    error: null,
    slug: null,
  });

  const boundDomainAction = updateCustomDomainAction.bind(null, orgSlug);
  const [domainState, domainFormAction, domainPending] = useActionState<DomainState, FormData>(
    boundDomainAction,
    { error: null, ok: false },
  );
  const [domain, setDomain] = useState(initialCustomDomain ?? "");

  useEffect(() => {
    if (!slugState.slug) return;
    router.replace(`/${slugState.slug}/setari`);
    router.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugState.slug]);

  return (
    <div className="mt-8 border-t border-line pt-6">
      <h2 className="font-display text-lg font-bold text-ink">{dict.title}</h2>

      <form action={slugFormAction} className="mt-4 flex flex-col gap-2">
        <label className="text-sm font-medium text-ink">
          {dict.adresaPlatforma}
          <div className="mt-1 flex items-center gap-1 text-sm text-muted">
            <span className="whitespace-nowrap">fundraising-academy-one.vercel.app/</span>
            <input
              name="slug"
              defaultValue={orgSlug}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              required
              className="min-w-0 flex-1 rounded-lg border border-line bg-panel px-3 py-2 text-ink"
            />
          </div>
        </label>
        <p className="text-xs text-muted">{dict.adresaNota}</p>
        {slugState.error && <p className="text-sm text-red-600">{slugState.error}</p>}
        {slugState.slug && !slugState.error && <p className="text-sm text-brand-green-hover">{dict.salvatRedirect}</p>}
        <button
          type="submit"
          disabled={slugPending}
          className="self-start rounded-lg border border-line bg-panel px-4 py-2 text-sm font-medium text-ink transition hover:border-brand-green disabled:opacity-60"
        >
          {slugPending ? dict.seSalveaza : dict.salveazaAdresa}
        </button>
      </form>

      <form action={domainFormAction} className="mt-6 flex flex-col gap-2">
        <label className="text-sm font-medium text-ink">
          {dict.domeniuPropriu}
          <input
            name="customDomain"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder={dict.domeniuPlaceholder}
            className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink"
          />
        </label>
        {domainState.error && <p className="text-sm text-red-600">{domainState.error}</p>}
        {domainState.ok && !domainState.error && <p className="text-sm text-brand-green-hover">{dict.salvat}</p>}
        <button
          type="submit"
          disabled={domainPending}
          className="self-start rounded-lg border border-line bg-panel px-4 py-2 text-sm font-medium text-ink transition hover:border-brand-green disabled:opacity-60"
        >
          {domainPending ? dict.seSalveaza : dict.salveazaDomeniul}
        </button>

        {domain && (
          <div className="mt-2 rounded-lg border border-line bg-panel-2 p-3 text-xs text-muted">
            <p className="font-medium text-ink">{dict.caSaFunctioneze(domain)}</p>
            <ol className="mt-1.5 list-decimal space-y-1 pl-4">
              <li>
                {dict.pasul1(domain, VERCEL_CNAME_TARGET)}
              </li>
              <li>{dict.pasul2}</li>
            </ol>
          </div>
        )}
      </form>
    </div>
  );
}
