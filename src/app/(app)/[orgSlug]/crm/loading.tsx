// Afișat instant la navigarea între paginile CRM, cât timp pagina nouă se încarcă pe server
// (shell-ul — sidebar, antet — rămâne pe loc; se înlocuiește doar zona de conținut).
export default function Loading() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-5" aria-busy="true" aria-live="polite">
      <div className="h-6 w-48 animate-pulse rounded-md bg-black/5" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-black/5" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-xl bg-black/5" />
    </div>
  );
}
