import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="text-5xl font-bold text-ink">404</p>
      <h1 className="mt-3 text-xl font-semibold text-ink">Pagina nu a fost găsită</h1>
      <p className="mt-1 text-sm text-muted">Page not found</p>
      <p className="mt-4 text-sm text-body">Adresa e greșită sau pagina a fost mutată. / The address is wrong or the page has moved.</p>
      <Link href="/" className="mt-6 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-canvas">
        Acasă / Home
      </Link>
    </main>
  );
}
