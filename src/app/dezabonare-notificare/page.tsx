import { linkNotificareValid } from "@/lib/notificari-oprite";

import { DezabonareNotificareForm } from "./form";

export const metadata = { title: "Dezabonare e-mail", robots: { index: false } };

const TEXTE: Record<string, { titlu: string; descriere: string }> = {
  "rezumat-calendar": { titlu: "Dezabonare de la rezumatul săptămânal", descriere: "Confirmă că nu mai vrei să primești în fiecare luni rezumatul calendarului de fundraising (termene și momente de campanie)." },
  "invitatie-feedback": { titlu: "Dezabonare de la invitațiile la chestionar", descriere: "Confirmă că nu mai vrei să primești invitații pe e-mail la chestionarul de satisfacție Alexandrit." },
};

// Pagină publică, deschisă din linkul semnat din e-mailurile pentru utilizatorii platformei. Dezabonarea se face DOAR la apăsarea butonului.
export default async function DezabonareNotificarePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const tip = sp.tip ?? "";
  const u = sp.u ?? "";
  const t = sp.t ?? "";
  const valid = linkNotificareValid(tip, u, t);
  const text = TEXTE[tip];

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <h1 className="text-xl font-bold text-ink">{valid && text ? text.titlu : "Dezabonare de la e-mail"}</h1>
      {valid && text ? (
        <>
          <p className="mt-2 mb-4 text-sm text-body">{text.descriere}</p>
          <DezabonareNotificareForm tip={tip} u={u} t={t} />
        </>
      ) : (
        <p className="mt-2 text-sm text-body">Linkul de dezabonare e invalid sau incomplet.</p>
      )}
    </main>
  );
}
