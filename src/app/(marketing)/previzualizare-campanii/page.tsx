import type { Metadata } from "next";

import { getCampaniiLanding, PRAG_ORGANIZATII, type AsociatiePublica } from "@/lib/campanii-publice";

import { CampaniiSectiune, type StareCampanii } from "../campanii-sectiune";

// Pagină ascunsă de lucru pentru secțiunea „Campanii” din prima pagină: nu e legată de nicăieri, nu intră în sitemap
// și are noindex. Arată secțiunea ACTIVĂ chiar și sub pragul de 20 de organizații.
//   /previzualizare-campanii            → datele reale (sau demo, dacă nu există campanii active)
//   /previzualizare-campanii?stare=demo → date demonstrative
//   /previzualizare-campanii?stare=curand → varianta „se deschid după primele 20”
export const metadata: Metadata = { title: "Previzualizare campanii", robots: { index: false, follow: false } };

const c = (id: string, titlu: string, domeniu: string, s: number, t: number | null) => ({
  id,
  href: "#",
  titlu,
  poveste: "Fiecare donație ne apropie de obiectiv. Vezi povestea completă, cum se folosesc banii și cine ne-a sprijinit până acum.",
  imagineUrl: null,
  domeniu,
  sumaStransa: s,
  sumaTinta: t,
});
const A = (nume: string, domeniu: string, judet: string, total: number, nr: number, campanii: ReturnType<typeof c>[]): AsociatiePublica => ({ slug: "demo", nume, logoUrl: null, domeniu, judet, totalStrans: total, nrCampanii: nr, coperta: null, campanii });
const DEMO: AsociatiePublica[] = [
  A("Asociația Salvează o Inimă", "sanatate", "București", 54300, 5, [c("1", "Operație pentru Maria, 7 ani", "sanatate", 31200, 40000), c("2", "Aparat de dializă pentru spital", "sanatate", 18900, 25000), c("3", "Transport medical pentru pacienți", "sanatate", 4200, null)]),
  A("Fundația Pentru Copii", "copii", "Cluj", 33100, 3, [c("4", "Școala de vară pentru 60 de copii", "copii", 14200, 20000), c("5", "Rechizite pentru clasa I", "copii", 9800, 12000), c("6", "Masă caldă la școală", "copii", 9100, 30000)]),
  A("Asociația Verde", "mediu", "Brașov", 12800, 2, [c("7", "Plantăm 5.000 de arbori", "mediu", 9800, 12000), c("8", "Curățăm malul râului", "mediu", 3000, 8000)]),
  A("Adăpostul Animalelor", "animale", "Iași", 6400, 2, [c("9", "Boxe încălzite pentru iarnă", "animale", 4100, 6000), c("10", "Sterilizări gratuite", "animale", 2300, 5000)]),
  A("Fundația Educația Contează", "educatie", "Timiș", 18000, 2, [c("11", "Burse pentru 15 liceeni", "educatie", 12000, 18000), c("12", "Laborator de informatică", "educatie", 6000, 15000)]),
  A("Asociația Incluziune", "social_incluziune", "Constanța", 9500, 1, [c("13", "Pachete alimentare pentru 200 de familii", "social_incluziune", 9500, 20000)]),
];
const STAT = { asociatii: 6, campanii: 15, strans: 134100 };

export default async function PrevizualizareCampanii({ searchParams }: { searchParams: Promise<{ stare?: string }> }) {
  const { stare } = await searchParams;
  const real = await getCampaniiLanding({ ignoraPrag: true }).catch(() => null);
  const organizatii = real?.organizatii ?? 0;

  let sursa: string;
  let data: Pick<StareCampanii, "active" | "asociatii" | "inFocus" | "statistici">;
  if (stare === "curand") {
    sursa = "varianta „se deschid după primele 20”, cu numărul real de organizații";
    data = { active: false, asociatii: [], inFocus: null, statistici: { asociatii: 0, campanii: 0, strans: 0 } };
  } else if (stare !== "demo" && real && real.asociatii.length > 0) {
    sursa = `date reale: ${real.asociatii.length} asociații cu campanii active, din ${organizatii} organizații înscrise`;
    data = { active: true, asociatii: real.asociatii, inFocus: real.inFocus, statistici: real.statistici };
  } else {
    sursa = stare === "demo" ? "date demonstrative (alese din link)" : "date demonstrative, pentru că nu există încă campanii active reale";
    data = { active: true, asociatii: DEMO, inFocus: { campanie: DEMO[0].campanii[0], asociatie: { nume: DEMO[0].nume, logoUrl: null, slug: "demo" } }, statistici: STAT };
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
