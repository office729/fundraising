import Link from "next/link";

export function DraftBanner() {
  return (
    <div className="mx-auto mb-8 max-w-3xl rounded-xl border-2 border-brand-amber bg-brand-amber-soft px-5 py-4 text-[13.5px] leading-relaxed text-ink">
      <strong>Proiect (draft)</strong> — text generic de plecare, generat automat. Conține câmpuri de completat
      (marcate <code className="rounded bg-white/60 px-1">[DE COMPLETAT]</code>) și trebuie verificat de un jurist
      înainte de a fi considerat definitiv sau folosit ca politică oficială a organizației.
    </div>
  );
}

export function LegalLayout({
  eyebrow,
  titlu,
  actualizat,
  children,
}: {
  eyebrow: string;
  titlu: string;
  actualizat: string;
  children: React.ReactNode;
}) {
  return (
    <main>
      <div className="px-[6%] pt-8 text-sm text-muted-2">
        <Link href="/" className="hover:text-brand-blue">
          Acasă
        </Link>{" "}
        › {titlu}
      </div>

      <section className="px-[6%] py-14">
        <div className="mx-auto max-w-3xl text-center">
          <span className="text-xs font-extrabold tracking-wide text-brand-green uppercase">{eyebrow}</span>
          <h1 className="font-display mt-2 text-[28px] leading-tight font-bold text-ink">{titlu}</h1>
          <p className="mt-1 text-[12.5px] text-muted-2">Ultima actualizare: {actualizat}</p>
        </div>

        <DraftBanner />

        <div className="mx-auto flex max-w-3xl flex-col gap-6 text-[14.5px] leading-relaxed text-body">{children}</div>
      </section>
    </main>
  );
}

export function Sectiune({ titlu, children }: { titlu: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-display text-base font-bold text-ink">{titlu}</h2>
      <div className="mt-2 flex flex-col gap-2.5">{children}</div>
    </div>
  );
}
