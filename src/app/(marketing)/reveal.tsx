"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Apariție la derulare: conținutul e vizibil din start (server + fără JavaScript); doar ce se află sub marginea
// ecranului la încărcare se ascunde și intră în cadru pe măsură ce ajunge în vizor. Respectă „reduce motion”.
export function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [stare, setStare] = useState<"init" | "ascuns" | "vizibil">("init");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return; // deja în ecran: rămâne la locul lui
    setStare("ascuns");
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setStare("vizibil");
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition duration-700 ease-out ${stare === "ascuns" ? "translate-y-5 opacity-0" : "translate-y-0 opacity-100"} ${className}`}
      style={{ transitionDelay: stare === "vizibil" ? `${delay}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}
