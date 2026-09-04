// Găsește un slug unic pornind de la un slug de bază, apelând `existaDeja`
// (verificarea de unicitate, specifică fiecărui apelant — tabel/scop diferit)
// până găsește unul liber, cu sufix numeric incremental. Control inversat
// (closure, nu un obiect `db`) ca să rămână reutilizabil indiferent de tipul
// conexiunii (tranzacție sau nu) — evită duplicarea aceleiași bucle în
// fiecare loc care are nevoie de un slug unic.
export async function genereazaSlugUnic(baseSlug: string, existaDeja: (slug: string) => Promise<boolean>): Promise<string> {
  let slug = baseSlug;
  for (let attempt = 1; attempt <= 20; attempt++) {
    if (!(await existaDeja(slug))) break;
    slug = `${baseSlug}-${attempt}`;
  }
  return slug;
}
