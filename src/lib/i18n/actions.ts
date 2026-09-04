"use server";

import { cookies } from "next/headers";

import { esteLocaleValid, LOCALE_COOKIE, type Locale } from "./config";

export async function setLocaleAction(locale: Locale): Promise<void> {
  if (!esteLocaleValid(locale)) return;
  const store = await cookies();
  // 1 an, pe tot site-ul — vizitatorul își alege limba o singură dată.
  store.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}
