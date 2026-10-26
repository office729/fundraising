import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

// Imaginea de previzualizare (Facebook, LinkedIn, WhatsApp, Google) pentru toate paginile care nu au una proprie.
export const alt = "Alexandrit: platformă de fundraising pentru ONG-uri din România";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const [font, logo] = await Promise.all([
    readFile(join(process.cwd(), "public", "fonts", "inter-regular.ttf")),
    readFile(join(process.cwd(), "public", "alexandrit-logo-alb.png")),
  ]);
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#154a85",
          color: "#ffffff",
          padding: "64px 72px",
          fontFamily: "Inter",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} width={346} height={66} alt="" />
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 68, lineHeight: 1.1, fontWeight: 400, maxWidth: 980 }}>Platforma de fundraising pentru ONG-uri din România</div>
          <div style={{ fontSize: 30, lineHeight: 1.35, color: "#c9dcf2", maxWidth: 940 }}>CRM pentru donatori și companii, pagini de donații, Formular 230 și Declarația 177, într-un singur loc.</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", background: "#2a7d44", color: "#ffffff", fontSize: 28, padding: "14px 30px", borderRadius: 999 }}>30 de zile gratuit, cu acces la tot</div>
          <div style={{ fontSize: 30, color: "#c9dcf2" }}>alexandrit.ro</div>
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Inter", data: font, style: "normal", weight: 400 }] },
  );
}
