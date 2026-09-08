// Filtre pentru lista de donatori REALI (spre deosebire de modulul mock/demo
// de mai jos, în pagină) — simplu, doar căutare + paginare, fără parametrii
// complecși de perioadă/marcaje din Companii (nu există încă atâtea date
// reale de donatori încât să justifice acea complexitate).

export type FiltruDonatoriReali = {
  q: string;
  pagina: number;
};

export function parseFiltruDonatoriReali(sp: URLSearchParams): FiltruDonatoriReali {
  return {
    q: sp.get("q") ?? "",
    pagina: Math.max(1, Number(sp.get("pagina")) || 1),
  };
}
