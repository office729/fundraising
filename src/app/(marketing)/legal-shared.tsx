import Link from "next/link";

export function LegalLayout({
  homeLabel,
  eyebrow,
  titlu,
  actualizatLabel,
  actualizat,
  children,
}: {
  locale?: "ro" | "en";
  homeLabel: string;
  eyebrow: string;
  titlu: string;
  actualizatLabel: string;
  actualizat: string;
  children: React.ReactNode;
}) {
  return (
    <main>
      <div className="px-[6%] pt-8 text-sm text-muted-2">
        <Link href="/" className="hover:text-brand-blue">
          {homeLabel}
        </Link>{" "}
        › {titlu}
      </div>

      <section className="px-[6%] py-14">
        <div className="mx-auto max-w-3xl text-center">
          <span className="text-xs font-extrabold tracking-wide text-brand-green uppercase">{eyebrow}</span>
          <h1 className="font-display mt-2 text-[28px] leading-tight font-bold text-ink">{titlu}</h1>
          <p className="mt-1 text-[12.5px] text-muted-2">
            {actualizatLabel}: {actualizat}
          </p>
        </div>

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
