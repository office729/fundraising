// Sigla oficială NETOPIA Payments (cu Mastercard și Visa), din secțiunea „Identitate vizuală” a contului nostru de comerciant.
// Netopia o servește de la mny.ro și numără afișările după `id` (valoarea „secret” din codul lor React: 169217), deci id-ul rămâne exact cel din cont.
// Varianta de culoare se alege după fundalul unde stă: „alb” pe fundal închis, „negru” pe fundal deschis.
const NETOPIA_LOGO_ID = "169217";

export function NetopiaLogo({ pe = "inchis", className }: { pe?: "inchis" | "deschis"; className?: string }) {
  const culoare = pe === "inchis" ? "white" : "black";
  return (
    <a href="https://netopia-payments.com/" target="_blank" rel="noopener noreferrer" className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element -- sigla trebuie încărcată exact de la Netopia (numără afișările după id) */}
      <img
        src={`https://mny.ro/np-${culoare}-0.svg?id=${NETOPIA_LOGO_ID}`}
        alt="NETOPIA Payments"
        title="NETOPIA Payments"
        width={223}
        height={40}
        loading="lazy"
        className="h-10 w-auto max-w-full"
      />
    </a>
  );
}
