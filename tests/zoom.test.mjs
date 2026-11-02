import { test } from "node:test";
import assert from "node:assert/strict";

const Z = await import("../src/lib/zoom-link.ts");

test("linkul Zoom: acceptă adrese de intrare reale, respinge restul", () => {
  assert.equal(Z.esteLinkZoom("https://us02web.zoom.us/j/84512345678?pwd=AbCdEf"), true);
  assert.equal(Z.esteLinkZoom("https://zoom.us/j/123456789"), true);
  assert.equal(Z.esteLinkZoom("https://eu01web.zoom.us/j/1234567890/"), true);
  assert.equal(Z.esteLinkZoom("  https://us06web.zoom.us/j/84512345678  "), true);
  assert.equal(Z.esteLinkZoom("http://zoom.us/j/123456789"), false, "doar https");
  assert.equal(Z.esteLinkZoom("https://zoom.us.evil.example/j/123456789"), false, "domeniu fals");
  assert.equal(Z.esteLinkZoom("https://evil.example/zoom.us/j/123456789"), false);
  assert.equal(Z.esteLinkZoom("https://zoom.us/j/12345"), false, "id prea scurt");
  assert.equal(Z.esteLinkZoom("https://meet.google.com/abc-defg-hij"), false);
  assert.equal(Z.esteLinkZoom(null), false);
  assert.equal(Z.esteLinkZoom(undefined), false);
});

test("id-ul întâlnirii din linkul Zoom", () => {
  assert.equal(Z.idDinLinkZoom("https://us02web.zoom.us/j/84512345678?pwd=AbCdEf"), "84512345678");
  assert.equal(Z.idDinLinkZoom("https://zoom.us/j/123456789"), "123456789");
  assert.equal(Z.idDinLinkZoom("https://meet.google.com/abc-defg-hij"), null);
  assert.equal(Z.idDinLinkZoom("Sediul Alexandrit, București"), null);
  assert.equal(Z.idDinLinkZoom(42), null);
});

test("linkul Google Meet: format abc-defg-hij, doar https pe meet.google.com", () => {
  assert.equal(Z.esteLinkMeet("https://meet.google.com/abc-defg-hij"), true);
  assert.equal(Z.esteLinkMeet("https://meet.google.com/abc-defg-hij?authuser=0"), true);
  assert.equal(Z.esteLinkMeet("  https://meet.google.com/xyz-wxyz-abc  "), true);
  assert.equal(Z.esteLinkMeet("http://meet.google.com/abc-defg-hij"), false);
  assert.equal(Z.esteLinkMeet("https://meet.google.com.evil.example/abc-defg-hij"), false);
  assert.equal(Z.esteLinkMeet("https://meet.google.com/new"), false, "pagina de creare nu e un link de ședință");
  assert.equal(Z.esteLinkMeet("https://zoom.us/j/123456789"), false);
  assert.equal(Z.esteLinkMeet(null), false);
});

test("locația ca adresă web: doar http(s) fără spații sau ghilimele", () => {
  assert.equal(Z.esteAdresaWeb("https://meet.google.com/abc-defg-hij"), true);
  assert.equal(Z.esteAdresaWeb("http://exemplu.ro/intalnire"), true);
  assert.equal(Z.esteAdresaWeb("Online, pe Zoom"), false);
  assert.equal(Z.esteAdresaWeb("https://exemplu.ro/a b"), false);
  assert.equal(Z.esteAdresaWeb('https://exemplu.ro/"><script>'), false);
  assert.equal(Z.esteAdresaWeb("javascript:alert(1)"), false);
});

test("corpul cererii către Zoom: UTC fără milisecunde, durată în limite, sală de așteptare", () => {
  const c = Z.corpIntalnireZoom({ subiect: "  Consultanță   fundraising: Ana (ONG X) ", start: new Date("2026-11-10T08:30:00.000Z"), durataMin: 45, agenda: "Despre Formularul 230" });
  assert.equal(c.topic, "Consultanță fundraising: Ana (ONG X)");
  assert.equal(c.type, 2);
  assert.equal(c.start_time, "2026-11-10T08:30:00Z");
  assert.equal(c.duration, 45);
  assert.equal(c.timezone, "Europe/Bucharest");
  assert.equal(c.agenda, "Despre Formularul 230");
  assert.equal(c.settings.waiting_room, true);
  assert.equal(c.settings.join_before_host, false);
  assert.equal(c.settings.auto_recording, "none");
  const scurta = Z.corpIntalnireZoom({ subiect: "x", start: new Date("2026-11-10T08:30:00Z"), durataMin: 3 });
  assert.equal(scurta.duration, 10);
  assert.equal("agenda" in scurta, false);
  assert.equal(Z.corpIntalnireZoom({ subiect: "x", start: new Date("2026-11-10T08:30:00Z"), durataMin: 9999 }).duration, 480);
  assert.equal(Z.corpIntalnireZoom({ subiect: "   ", start: new Date("2026-11-10T08:30:00Z"), durataMin: 30 }).topic, "Ședință Alexandrit");
  assert.equal(Z.corpIntalnireZoom({ subiect: "a".repeat(500), start: new Date("2026-11-10T08:30:00Z"), durataMin: 30 }).topic.length, 200);
});
