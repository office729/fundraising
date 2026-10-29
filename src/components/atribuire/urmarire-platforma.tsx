"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { urmareste } from "@/lib/atribuire/client";

// Numără paginile site-ului public al platformei (de unde vin ONG-urile care ajung să se înscrie). Fără acordul pentru statistici nu se păstrează nimic pe
// dispozitiv; cine a refuzat nu e numărat deloc; paginile din panou (autentificat) nu intră aici. Nu afișează nimic.
export function UrmarirePlatforma() {
  const cale = usePathname();
  useEffect(() => {
    urmareste("platforma", "vizita");
  }, [cale]);
  return null;
}
