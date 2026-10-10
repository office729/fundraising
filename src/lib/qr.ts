import qrcode from "qrcode-generator";

// Cod QR ca SVG inline (un singur <path>), fără imagini externe: intră direct în documentele HTML autonome.
// Corecție de erori „M” (≈15%): rămâne lizibil și tipărit mic. `marime` e orice lungime CSS (ex. „18mm” sau „6cqw”).
export function qrSvg(text: string, marime: string, culoare = "#111"): string {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const margine = 2; // zona liniștită din jurul codului, în module
  let cale = "";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c)) cale += `M${c + margine} ${r + margine}h1v1h-1z`;
    }
  }
  const lat = n + margine * 2;
  return `<svg viewBox="0 0 ${lat} ${lat}" style="display:block;width:${marime};height:${marime}" role="img" aria-label="Cod QR" shape-rendering="crispEdges"><rect width="${lat}" height="${lat}" fill="#fff"/><path d="${cale}" fill="${culoare}"/></svg>`;
}
