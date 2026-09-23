import { AUTH_DICT } from "@/lib/i18n/dictionaries/auth";
import { getLocale } from "@/lib/i18n/get-locale";

import { ForgotPasswordForm } from "./forgot-password-form";

export default async function ForgotPasswordPage() {
  const locale = await getLocale();
  return <ForgotPasswordForm dict={AUTH_DICT[locale]} />;
}
