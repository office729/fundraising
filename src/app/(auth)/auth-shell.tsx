import Image from "next/image";
import Link from "next/link";

// Cadrul comun al paginilor de cont (înscriere, autentificare, resetare parolă): sigla deasupra și un card central pe fundal discret,
// ca în produsele moderne — în loc de formulare goale, lipite de marginea ecranului.
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center bg-panel-2 px-4 py-10 sm:justify-center sm:py-12">
      <Link href="/" aria-label="Alexandrit" className="mb-6 shrink-0">
        <Image src="/alexandrit-logo.webp" alt="Alexandrit" width={1730} height={332} sizes="170px" priority className="h-8 w-auto" />
      </Link>
      <div className="w-full max-w-[420px] rounded-2xl border border-line bg-panel p-6 shadow-sm sm:p-8">{children}</div>
    </main>
  );
}
