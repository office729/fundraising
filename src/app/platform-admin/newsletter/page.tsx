import Link from "next/link";

import { cerePlatformAdminPagina } from "@/lib/auth/platform-admin";
import { NEWSLETTER_ALEXANDRIT_HTML } from "@/modules/crm/newsletter-alexandrit/newsletter-alexandrit-html";
import { StandaloneToolFrame } from "@/modules/crm/shared/standalone-tool-frame";

export const dynamic = "force-dynamic";
export const metadata = { title: "Newsletter Alexandrit — panou platformă", robots: { index: false, follow: false } };

// Doar pentru contul platformei: șabloanele newsletterului Alexandrit (cel trimis din Newsman către ONG-uri), cu câmpuri de editat și codul HTML de lipit în Newsman.
// Nu e un instrument al organizațiilor client (acelea au newsletter-pf / newsletter-pj, pentru donatorii lor).
export default async function NewsletterAlexandritPage() {
  await cerePlatformAdminPagina();
  return (
    <main className="mx-auto flex h-[100dvh] max-w-7xl flex-col px-6 py-5">
      <Link href="/platform-admin" className="text-[13px] font-medium text-muted transition hover:text-brand-blue">
        ← Panou platformă
      </Link>
      <div className="mt-3 min-h-0 flex-1 overflow-hidden rounded-xl border border-line">
        <StandaloneToolFrame html={NEWSLETTER_ALEXANDRIT_HTML} title="Generator newsletter Alexandrit" orgSlug="platforma" />
      </div>
    </main>
  );
}
