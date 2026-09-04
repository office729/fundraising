"use client";

export function genereazaContractSponsorizare(
  companie: { nume: string; cui: string; regCom: string; localitate: string; judet: string },
  suma: number,
  proiect: string,
) {
  const azi = new Intl.DateTimeFormat("ro-RO", { day: "2-digit", month: "long", year: "numeric" }).format(new Date());
  const sumaText = suma.toLocaleString("ro-RO");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <style>body{font-family:Calibri,Arial,sans-serif;font-size:12pt;line-height:1.5;} h1{text-align:center;font-size:16pt;} h3{margin-top:20px;} .semnaturi{margin-top:60px;display:flex;justify-content:space-between;}</style>
    </head><body>
    <h1>CONTRACT DE SPONSORIZARE</h1>
    <p>Încheiat astăzi, ${azi}, între:</p>
    <p><b>ASOCIAȚIA SALVEAZĂ O INIMĂ</b>, cu sediul în România, denumită în continuare <b>„Beneficiar"</b>,</p>
    <p>și</p>
    <p><b>${companie.nume}</b>, cu sediul în ${companie.localitate}, jud. ${companie.judet}, CUI ${companie.cui}, ${companie.regCom}, denumită în continuare <b>„Sponsor"</b>,</p>
    <p>s-a încheiat prezentul contract de sponsorizare, cu respectarea prevederilor Legii nr. 32/1994 privind sponsorizarea, în următoarele condiții:</p>

    <h3>Art. 1 — Obiectul contractului</h3>
    <p>Sponsorul se obligă să acorde Beneficiarului suma de <b>${sumaText} RON</b>, cu titlu de sponsorizare${proiect ? `, destinată proiectului „${proiect}"` : ""}.</p>

    <h3>Art. 2 — Obligațiile Beneficiarului</h3>
    <p>Beneficiarul se obligă să utilizeze suma exclusiv în scopul declarat și să transmită Sponsorului un raport privind modul de utilizare a fondurilor.</p>

    <h3>Art. 3 — Durata contractului</h3>
    <p>Prezentul contract intră în vigoare la data semnării de către ambele părți și este valabil până la îndeplinirea integrală a obligațiilor asumate.</p>

    <h3>Art. 4 — Dispoziții finale</h3>
    <p>Prezentul contract a fost încheiat în două exemplare originale, câte unul pentru fiecare parte.</p>

    <div class="semnaturi">
      <p>Sponsor,<br/>${companie.nume}<br/><br/>_______________________</p>
      <p>Beneficiar,<br/>Asociația Salvează o Inimă<br/><br/>_______________________</p>
    </div>
  </body></html>`;

  const blob = new Blob(["﻿", html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Contract sponsorizare - ${companie.nume}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
