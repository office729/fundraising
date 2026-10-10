"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { checkInAction } from "../../actions-voluntari";

export function ConfirmaPrezenta({ cod, shiftId, token }: { cod: string; shiftId: string; token: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [eroare, setEroare] = useState("");
  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await checkInAction(cod, shiftId, token);
            if (r.ok) router.refresh();
            else setEroare(r.eroare);
          })
        }
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--vp-brand)] px-4 py-3 text-[16px] font-semibold text-white disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[var(--vp-brand)] focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        <Check className="size-5" aria-hidden /> {pending ? "Se confirmă…" : "Confirmă prezența"}
      </button>
      {eroare && (
        <p role="alert" className="mt-3 rounded-lg bg-[#fdecea] px-3 py-2 text-[13.5px] text-[#9b2c20]">
          {eroare}
        </p>
      )}
    </>
  );
}
