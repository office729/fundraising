"use client";

import { useActionState, useState } from "react";

// `useActionState` din React 19 RESETEAZĂ câmpurile necontrolate ale formularului după ORICE acțiune, inclusiv când
// serverul a răspuns cu o eroare de validare: utilizatorul pierdea tot ce scrisese (un text lung de campanie, emailul
// etc.). Această variantă păstrează valorile trimise și le oferă ca `defaultValue` — resetarea le restaurează în loc să
// le șteargă. Câmpurile listate în `excluse` (ex. parola) NU se rețin niciodată.
export function useActionStatePastrat<S>(
  action: (prev: S, formData: FormData) => Promise<S>,
  initial: S,
  excluse: string[] = ["password"],
) {
  const [valori, setValori] = useState<Record<string, string>>({});
  const [state, formAction, pending] = useActionState(async (prev: Awaited<S>, formData: FormData) => {
    const v: Record<string, string> = {};
    formData.forEach((val, k) => {
      if (typeof val === "string" && !excluse.includes(k)) v[k] = val;
    });
    setValori(v);
    return (await action(prev as S, formData)) as Awaited<S>;
  }, initial as Awaited<S>);
  return [state as S, formAction, pending, valori] as const;
}
