// Slug rezervat pentru contul implicit de Formular 230 al fiecărei organizații
// (creat la signup — vezi src/app/(auth)/signup/actions.ts) — păstrează
// funcțional link-ul vechi /f230/<orgSlug> (redirect către
// /f230/<orgSlug>/principal). Nu poate fi redenumit sau șters — vezi
// beneficiari-actions.ts. Fișier separat (nu "use server") pentru că poate fi
// importat atât din server actions cât și din alte module server simple.
export const SLUG_PRINCIPAL = "principal";
