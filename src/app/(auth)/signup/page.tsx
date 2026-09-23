import { AUTH_DICT } from "@/lib/i18n/dictionaries/auth";
import { getLocale } from "@/lib/i18n/get-locale";

import { SignupForm } from "./signup-form";

export default async function SignupPage() {
  const locale = await getLocale();
  return <SignupForm dict={AUTH_DICT[locale]} />;
}
