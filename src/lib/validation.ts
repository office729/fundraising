export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailValid(email: string): boolean {
  return EMAIL_RE.test(email);
}

// Normalizare pentru comparații/chei unice (ex. donatori_reali.email) —
// "Ion@Test.com" și "ion@test.com" trebuie să fie aceeași persoană. NU pentru
// afișare (păstrează capitalizarea originală acolo unde e doar text afișat).
export function normalizeazaEmail(email: string): string {
  return email.trim().toLowerCase();
}
