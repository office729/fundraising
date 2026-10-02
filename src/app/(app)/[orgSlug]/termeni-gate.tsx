"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { acceptaTermeniAction, logoutAction } from "./actions";

type Dict = {
  titlu: string;
  desc: string;
  acceptPre: string;
  termeni: string;
  acceptSi: string;
  gdpr: string;
  buton: string;
  logout: string;
  eroare: string;
};

export function TermeniGate({ orgSlug, dict }: { orgSlug: string; dict: Dict }) {
  const router = useRouter();
  const [accepta, setAccepta] = useState(false);
  const [eroare, setEroare] = useState(false);
  const [pending, startTransition] = useTransition();

  function trimite(e: React.FormEvent) {
    e.preventDefault();
    if (!accepta) return;
    setEroare(false);
    startTransition(async () => {
      try {
        await acceptaTermeniAction(orgSlug);
        router.refresh();
      } catch {
        setEroare(true);
      }
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <form onSubmit={trimite} className="w-full max-w-md rounded-xl border border-line bg-panel p-7">
        <h1 className="font-display text-xl font-bold text-ink">{dict.titlu}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">{dict.desc}</p>

        <label className="mt-5 flex items-start gap-2.5 text-[13px] leading-relaxed text-body">
          <input
            type="checkbox"
            checked={accepta}
            onChange={(e) => setAccepta(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-line"
          />
          <span>
            {dict.acceptPre}{" "}
            <Link href="/termeni" target="_blank" className="font-medium text-brand-green underline">
              {dict.termeni}
            </Link>{" "}
            {dict.acceptSi}{" "}
            <Link href="/gdpr" target="_blank" className="font-medium text-brand-green underline">
              {dict.gdpr}
            </Link>
            .
          </span>
        </label>

        {eroare && <p className="mt-3 text-sm text-red-600">{dict.eroare}</p>}

        <button
          type="submit"
          disabled={!accepta || pending}
          className="mt-5 w-full rounded-md bg-brand-green px-5 py-3 font-bold text-white transition hover:bg-brand-green-hover disabled:opacity-50"
        >
          {dict.buton}
        </button>
        <button
          type="button"
          onClick={() => void logoutAction()}
          className="mt-3 w-full text-center text-[13px] font-medium text-muted transition hover:text-brand-blue"
        >
          {dict.logout}
        </button>
      </form>
    </div>
  );
}
