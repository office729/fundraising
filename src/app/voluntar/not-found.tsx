import { LinkIcon } from "lucide-react";

import { VOLUNTAR_UI_DICT } from "@/lib/i18n/dictionaries/voluntar-ui";
import { getLocale } from "@/lib/i18n/get-locale";

// Cod greșit, link oprit sau înlocuit: același mesaj, ca să nu aflăm nimic despre ce există.
export default async function VoluntarNegasit() {
  const t = VOLUNTAR_UI_DICT[await getLocale()].notFound;
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f8fb] px-6 text-center text-[#2b2420]" style={{ colorScheme: "light" }}>
      <div className="max-w-sm">
        <LinkIcon className="mx-auto size-9 text-[#6e625a]" aria-hidden />
        <h1 className="mt-3 font-display text-[22px] font-bold">{t.titlu}</h1>
        <p className="mt-2 text-[15px] text-[#6e625a]">{t.text}</p>
      </div>
    </main>
  );
}
