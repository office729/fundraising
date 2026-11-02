import { test } from "node:test";
import assert from "node:assert/strict";

const G = await import("../src/lib/google-meet-corp.ts");

test("evenimentul Calendar cu Meet: ora în UTC fără milisecunde, fără invitați, token în proprietate privată", () => {
  const c = G.corpEvenimentMeet({ subiect: "  Consultanță   1 la 1: Ana (ONG X) ", start: new Date("2026-11-10T08:00:00.000Z"), durataMin: 30, agenda: "Despre F230", tokenProgramare: "tok_abc", idCerere: "11111111-2222-3333-4444-555555555555" });
  assert.equal(c.summary, "Consultanță 1 la 1: Ana (ONG X)");
  assert.equal(c.description, "Despre F230");
  assert.deepEqual(c.start, { dateTime: "2026-11-10T08:00:00Z", timeZone: "Europe/Bucharest" });
  assert.deepEqual(c.end, { dateTime: "2026-11-10T08:30:00Z", timeZone: "Europe/Bucharest" });
  assert.equal(c.visibility, "private");
  assert.equal("attendees" in c, false, "fără invitați: Google nu trimite emailuri");
  assert.deepEqual(c.conferenceData, { createRequest: { requestId: "11111111-2222-3333-4444-555555555555", conferenceSolutionKey: { type: "hangoutsMeet" } } });
  assert.deepEqual(c.extendedProperties, { private: { alexandritToken: "tok_abc" } });
  const scurt = G.corpEvenimentMeet({ subiect: "x", start: new Date("2026-11-10T08:00:00Z"), durataMin: 3, tokenProgramare: "t", idCerere: "i" });
  assert.equal(scurt.end.dateTime, "2026-11-10T08:10:00Z", "durata minimă 10 minute");
  assert.equal("description" in scurt, false);
  assert.equal(G.corpEvenimentMeet({ subiect: "   ", start: new Date("2026-11-10T08:00:00Z"), durataMin: 30, tokenProgramare: "t", idCerere: "i" }).summary, "Ședință Alexandrit");
});

test("linkul Meet din răspunsul Google: hangoutLink sau punctul de intrare video; altceva = null", () => {
  assert.deepEqual(G.linkMeetDinEveniment({ id: "ev1", hangoutLink: "https://meet.google.com/abc-defg-hij" }), { link: "https://meet.google.com/abc-defg-hij", id: "ev1" });
  assert.deepEqual(G.linkMeetDinEveniment({ id: "ev2", conferenceData: { entryPoints: [{ entryPointType: "phone", uri: "tel:+1" }, { entryPointType: "video", uri: "https://meet.google.com/xyz-wxyz-abc" }] } }), { link: "https://meet.google.com/xyz-wxyz-abc", id: "ev2" });
  assert.equal(G.linkMeetDinEveniment({ id: "ev3" }), null);
  assert.equal(G.linkMeetDinEveniment({ id: "ev4", hangoutLink: "https://evil.example/abc-defg-hij" }), null);
  assert.equal(G.linkMeetDinEveniment({ hangoutLink: "https://meet.google.com/abc-defg-hij" }), null, "fără id nu putem șterge evenimentul");
  assert.equal(G.linkMeetDinEveniment(null), null);
  assert.equal(G.linkMeetDinEveniment("x"), null);
});

test("emailul din id_token: doar pentru afișare, tolerant la valori greșite", () => {
  const jwt = (p) => `h.${Buffer.from(JSON.stringify(p)).toString("base64url")}.s`;
  assert.equal(G.emailDinIdToken(jwt({ email: "vlad@gmail.com", sub: "1" })), "vlad@gmail.com");
  assert.equal(G.emailDinIdToken(jwt({ sub: "1" })), null);
  assert.equal(G.emailDinIdToken(jwt({ email: "nu e email" })), null);
  assert.equal(G.emailDinIdToken("nu-e-jwt"), null);
  assert.equal(G.emailDinIdToken(undefined), null);
});

test("salvarea setărilor păstrează conexiunea Google criptată", () => {
  const vechi = { titlu: "Vechi", googleMeet: { refresh: "v1.a.b.c", email: "x@gmail.com", conectatLa: "2026-11-02T10:00:00Z" } };
  const nou = G.pastreazaConexiuneGoogle({ titlu: "Nou", intro: "i" }, vechi);
  assert.equal(nou.titlu, "Nou");
  assert.deepEqual(nou.googleMeet, vechi.googleMeet);
  assert.equal("googleMeet" in G.pastreazaConexiuneGoogle({ titlu: "Nou" }, { titlu: "Vechi" }), false, "fără conexiune veche nu apare nimic");
  assert.equal("googleMeet" in G.pastreazaConexiuneGoogle({ titlu: "Nou" }, null), false);
});
