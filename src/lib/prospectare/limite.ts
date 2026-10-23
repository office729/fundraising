// Limita de apeluri către furnizori de prospectare pe organizație, pe 24 de ore (peste ea, căutarea se oprește cu un mesaj).
export const LIMITA_APELURI_PE_ZI = 60;

// Rezervare la începutul unei căutări: atâtea apeluri se rețin din limita zilnică, ca două căutări simultane să nu o depășească împreună.
export const APELURI_REZERVATE_PER_CAUTARE = 20;
// O rezervare uitată (căutare întreruptă) nu mai blochează limita după atâtea minute.
export const REZERVARE_EXPIRA_MIN = 10;
// În cât timp se poate repeta căutarea pe aceeași firmă fără confirmare (consumă credite).
export const COOLDOWN_CAUTARE_ORE = 24;

// Data de azi în București, ca „YYYY-MM-DD” (serverul rulează în UTC; termenele se socotesc după ziua de la noi).
export function aziBucuresti(acum: Date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Bucharest" }).format(acum);
}

// Data peste `n` zile lucrătoare de la o dată „YYYY-MM-DD” (sâmbăta și duminica nu se numără; sărbătorile legale nu sunt luate în calcul), ca „YYYY-MM-DD”.
export function adaugaZileLucratoare(de: string, n: number): string {
  const [a, m, z] = de.slice(0, 10).split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1, z));
  let ramase = n;
  while (ramase > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const zi = d.getUTCDay();
    if (zi !== 0 && zi !== 6) ramase--;
  }
  return d.toISOString().slice(0, 10);
}
