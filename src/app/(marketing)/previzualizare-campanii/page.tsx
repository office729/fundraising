import type { Metadata } from "next";

import { getCampaniiLanding, PRAG_ORGANIZATII, type AsociatiePublica } from "@/lib/campanii-publice";

import { CampaniiSectiune } from "../campanii-sectiune";

// Pagină ascunsă de lucru pentru secțiunea „Campanii” din prima pagină: nu e legată de nicăieri, nu intră în sitemap
// și are noindex. Arată secțiunea ACTIVĂ chiar și sub pragul de 20 de organizații.
//   /previzualizare-campanii            → datele reale (sau demo, dacă nu există campanii active)
//   /previzualizare-campanii?stare=demo → date demonstrative
//   /previzualizare-campanii?stare=curand → varianta „se deschid după primele 20”
export const metadata: Metadata = { title: "Previzualizare campanii", robots: { index: false, follow: false } };

const c = (id: string, titlu: string, s: number, t: number | null) => ({ id, href: "#", titlu, imagineUrl: null, sumaStransa: s, sumaTinta: t });
const DEMO: AsociatiePublica[] = [
  { slug: "demo", nume: "Asociația Salvează o Inimă", logoUrl: null, domeniu: "sanatate", totalStrans: 54300, nrCampanii: 5, campanii: [c("1", "Operație pentru Maria, 7 ani", 31200, 40000), c("2", "Aparat de dializă pentru spital", 18900, 25000), c("3", "Transport medical pentru pacienți", 4200, null)] },
  { slug: "demo", nume: "Fundația Pentru Copii", logoUrl: null, domeniu: "copii", totalStrans: 33100, nrCampanii: 3, campanii: [c("4", "Școala de vară pentru 60 de copii", 14200, 20000), c("5", "Rechizite pentru clasa I", 9800, 12000), c("6", "Masă caldă la școală", 9100, 30000)] },
  { slug: "demo", nume: "Asociația Verde", logoUrl: null, domeniu: "mediu", totalStrans: 12800, nrCampanii: 2, campanii: [c("7", "Plantăm 5.000 de arbori", 9800, 12000), c("8", "Curățăm malul râului", 3000, 8000)] },
  { slug: "demo", nume: "Adăpostul Animalelor", logoUrl: null, domeniu: "animale", totalStrans: 6400, nrCampanii: 2, campanii: [c("9", "Boxe încălzite pentru iarnă", 4100, 6000), c("10", "Sterilizări gratuite", 2300, 5000)] },
];

export default async function PrevizualizareCampanii({ searchParams }: { searchParams: Promise<{ stare?: string }> }) {
  const { stare } = await searchParams;
  const real = await getCampaniiLanding({ ignoraPrag: true }).catch(() => null);
  const organizatii = real?.organizatii ?? 0;

  let sursa: string;
  let data: { active: boolean; asociatii: AsociatiePublica[] };
  if (stare === "curand") {
    sursa = "varianta „se deschid după primele 20”, cu numărul real de organizații";
    data = { active: false, asociatii: [] };
  } else if (stare !== "demo" && real && real.asociatii.length > 0) {
    sursa = `date reale: ${real.asociatii.length} asociații cu campanii active, din ${organizatii} organizații înscrise`;
    data = { active: true, asociatii: real.asociatii };
  } else {
    sursa = stare === "demo" ? "date demonstrative (alese din link)" : "date demonstrative, pentru că nu există încă campanii active reale";
    data = { active: true, asociatii: DEMO };
  }

  return (
    <main>
      <div className="border-b border-amber-300 bg-amber-50 px-[6%] py-3 text-center text-[13px] text-amber-900">
        <b>Pagină ascunsă de lucru</b> — nu e legată din site și nu apare în Google. Acum se vede: {sursa}. Praguri: {organizatii} din {PRAG_ORGANIZATII} organizații.{" "}
        <a href="?stare=demo" className="font-semibold underline">demo</a> · <a href="?stare=curand" className="font-semibold underline">în curând</a> · <a href="?" className="font-semibold underline">real</a>
      </div>
      <CampaniiSectiune stare={{ organizatii, prag: PRAG_ORGANIZATII, ...data }} />
    </main>
  );
}
