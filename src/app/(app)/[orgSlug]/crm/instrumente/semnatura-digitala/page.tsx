import { boldsignConfigurat } from "@/lib/boldsign";

import { SemnaturaForm } from "./semnatura-form";

export default async function SemnaturaDigitalaPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">Semnătură digitală</h1>
        <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">
          Trimite contracte de sponsorizare, acorduri sau alte documente PDF la semnat electronic, prin BoldSign. Semnatarii primesc linkul pe email și semnează de pe orice dispozitiv.
        </p>
      </div>
      <SemnaturaForm orgSlug={orgSlug} configurat={boldsignConfigurat()} />
    </div>
  );
}
