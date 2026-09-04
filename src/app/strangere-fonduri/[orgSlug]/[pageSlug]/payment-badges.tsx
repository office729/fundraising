// Butoane de metodă de plată — momentan doar vizuale (fără onClick), toate
// pornesc practic aceeași sesiune Stripe Checkout la Donează. Când se
// integrează alegerea per-metodă în Stripe (payment_method_types explicit pe
// sesiune, per metoda aleasă), acest fișier devine "use client" și fiecare
// buton primește propriul onClick — markup-ul e deja pregătit ca <button>.

function AppleMark() {
  return (
    <svg width="18" height="21" viewBox="0 0 15 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        fill="white"
        d="M12.24 9.53c-.02-2.03 1.66-3 1.73-3.05-.94-1.38-2.41-1.57-2.93-1.59-1.25-.13-2.44.74-3.07.74-.63 0-1.61-.72-2.64-.7-1.36.02-2.62.79-3.32 2.01-1.42 2.46-.36 6.1 1.02 8.1.67.98 1.48 2.08 2.53 2.04 1.02-.04 1.4-.66 2.63-.66 1.23 0 1.57.66 2.64.64 1.09-.02 1.78-.99 2.44-1.98.77-1.13 1.09-2.23 1.1-2.28-.02-.01-2.11-.81-2.13-3.22Z"
      />
      <path
        fill="white"
        d="M10.19 3.51c.55-.67.92-1.6.82-2.51-.79.03-1.75.52-2.32 1.19-.51.59-.96 1.55-.84 2.46.9.07 1.79-.46 2.34-1.14Z"
      />
    </svg>
  );
}

function GoogleGMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.81.54-1.85.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03l3-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .95 4.97l3 2.33C4.66 5.17 6.65 3.58 9 3.58Z" />
    </svg>
  );
}

// Aceleași dimensiuni ca butonul verde „Donează acum" (w-full, rounded-xl,
// px-6 py-3.5, text-[15px] font-bold) — cerut explicit, unul sub altul, nu
// grupate 2x2.
const badgeCls =
  "flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-[15px] font-bold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0";

export function PaymentBadges() {
  return (
    <div className="flex flex-col gap-2.5">
      <button type="button" className={`${badgeCls} bg-black text-white`}>
        <AppleMark />
        Pay
      </button>

      <button type="button" className={`${badgeCls} border border-line bg-panel`}>
        <GoogleGMark />
        <span className="text-muted-2">Pay</span>
      </button>

      <button type="button" className={`${badgeCls} border border-line bg-panel`}>
        <span style={{ fontFamily: "Georgia, serif" }} className="text-[17px] italic">
          <span className="text-[#003087]">Pay</span>
          <span className="text-[#009cde]">Pal</span>
        </span>
      </button>

      <button type="button" className={`${badgeCls} bg-black text-white`}>
        Revolut
      </button>
    </div>
  );
}
