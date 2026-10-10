import { LinkIcon } from "lucide-react";

// Cod greșit, link oprit sau înlocuit: același mesaj, ca să nu aflăm nimic despre ce există.
export default function VoluntarNegasit() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f8fb] px-6 text-center text-[#2b2420]" style={{ colorScheme: "light" }}>
      <div className="max-w-sm">
        <LinkIcon className="mx-auto size-9 text-[#6e625a]" aria-hidden />
        <h1 className="mt-3 font-display text-[22px] font-bold">Linkul nu mai este valabil</h1>
        <p className="mt-2 text-[15px] text-[#6e625a]">Cere echipei organizației linkul actual al panoului pentru voluntari.</p>
      </div>
    </main>
  );
}
