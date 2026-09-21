"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { trackEvent } from "@/lib/analytics";

// Cât timp plata e "în așteptare" (IPN-ul Netopia poate întârzia câteva
// secunde), reîncărcăm pagina din server la 3 secunde, de cel mult 20 de ori.
export function AutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      router.refresh();
      if (n >= 20) clearInterval(id);
    }, 3000);
    return () => clearInterval(id);
  }, [router]);
  return null;
}

// Evenimentul de conversie — doar pentru o plată CONFIRMATĂ de IPN, nu pentru
// simpla întoarcere de pe pagina Netopia (care se întâmplă și la plăți eșuate).
// transaction_id deduplică în GA4, iar sessionStorage evită retrimiterea la
// reîncărcarea paginii.
export function PurchaseTracker({ orderId, value, item }: { orderId: string; value: number; item: string }) {
  useEffect(() => {
    const cheie = `fa_purchase_${orderId}`;
    try {
      if (window.sessionStorage.getItem(cheie) === "1") return;
      window.sessionStorage.setItem(cheie, "1");
    } catch {
      // storage blocat — transaction_id deduplică oricum
    }
    trackEvent("purchase", { transaction_id: orderId, currency: "RON", value, items: [{ item_name: item, quantity: 1 }] });
  }, [orderId, value, item]);
  return null;
}
