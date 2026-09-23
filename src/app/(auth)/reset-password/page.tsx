import { AUTH_DICT } from "@/lib/i18n/dictionaries/auth";
import { getLocale } from "@/lib/i18n/get-locale";

import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage() {
  const locale = await getLocale();
  return <ResetPasswordForm dict={AUTH_DICT[locale]} />;
}
