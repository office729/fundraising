import { test } from "node:test";
import assert from "node:assert/strict";

const R = await import("../src/lib/agent-email/reguli.ts");
const P = await import("../src/lib/agent-email/raspunsuri-reguli.ts");
const N = await import("../src/lib/agent-email/retea.ts");
const AI = await import("../src/lib/agent-email/prompt.ts");

const sarbatoareTest = (iso) => ["2026-11-30", "2026-12-01"].includes(iso);

// ===== Salut =====
test("salutul: doamna / domnule doar când e clar din nume; altfel numele complet; nume curățate de resturi de import", () => {
  assert.deepEqual(R.salutPentru("Andreea Popescu"), { salut: "Bună ziua, doamna Popescu,", ghicit: true });
  assert.deepEqual(R.salutPentru("Ion Popescu"), { salut: "Bună ziua, domnule Popescu,", ghicit: true });
  assert.equal(R.salutPentru("Mădălina Diaconu —").salut, "Bună ziua, doamna Diaconu,");
  assert.deepEqual(R.salutPentru("Popescu"), { salut: "Bună ziua, Popescu,", ghicit: false });
  // un prenume bărbătesc în „a” nu se ia drept femeie
  assert.equal(R.salutPentru("Luca Moldovan").ghicit, false);
  assert.equal(R.numeCurat("Ion Pop,"), "Ion Pop");
});

test("salutul calculat înlocuiește un salut diferit al modelului sau se adaugă dacă lipsește", () => {
  assert.equal(R.asiguraSalut("Bună ziua, domnule X,\n\nText.", "Bună ziua, doamna Y,"), "Bună ziua, doamna Y,\n\nText.");
  assert.equal(R.asiguraSalut("Bună ziua, doamna Y,\n\nText.", "Bună ziua, doamna Y,"), "Bună ziua, doamna Y,\n\nText.");
  assert.equal(R.asiguraSalut("Text fără salut.", "Bună ziua, doamna Y,"), "Bună ziua, doamna Y,\n\nText fără salut.");
});

// ===== Zile lucrătoare și propunerea de apel =====
test("zile lucrătoare: luni–vineri, în ora României, fără sărbători legale când sunt date", () => {
  const vineri = new Date("2026-11-06T09:00:00Z");
  assert.equal(R.zileLucratoare(vineri, new Date("2026-11-13T09:00:00Z")), 5);
  assert.equal(R.zileLucratoare(vineri, new Date("2026-11-08T09:00:00Z")), 0); // sâmbătă-duminică
  assert.equal(R.zileLucratoare(new Date("2026-11-27T09:00:00Z"), new Date("2026-12-04T09:00:00Z")), 5);
  assert.equal(R.zileLucratoare(new Date("2026-11-27T09:00:00Z"), new Date("2026-12-04T09:00:00Z"), sarbatoareTest), 3);
  // 23:30 UTC e deja ziua următoare în România (vara +3, iarna +2)
  assert.equal(R.ziBucuresti(new Date("2026-11-05T23:30:00Z")), "2026-11-06");
});

test("propunerea de apel: 3 intervale concrete, în zile lucrătoare, nu în sărbători", () => {
  const s = R.sloturiApel(new Date("2026-11-26T10:00:00Z"), sarbatoareTest);
  assert.equal((s.match(/între/g) ?? []).length, 3);
  assert.ok(!/30 noiembrie|1 decembrie/.test(s), s);
  assert.ok(!/sâmbătă|duminică/.test(s), s);
  assert.equal((R.sloturiApel(new Date("2026-11-04T10:00:00Z"), undefined, 2).match(/între/g) ?? []).length, 2);
});

test("revenirea e scadentă după 5 zile lucrătoare fără răspuns real și fără altă revenire; nu după 45 de zile", () => {
  const baza = { tip: "prim", stare: "trimis", areRaspunsReal: false, areRevenire: false };
  const acum = new Date("2026-11-13T10:00:00Z");
  assert.equal(R.revenireScadenta({ ...baza, trimisLa: new Date("2026-11-06T10:00:00Z") }, acum), true);
  assert.equal(R.revenireScadenta({ ...baza, trimisLa: new Date("2026-11-09T10:00:00Z") }, acum), false);
  assert.equal(R.revenireScadenta({ ...baza, trimisLa: new Date("2026-11-06T10:00:00Z"), areRaspunsReal: true }, acum), false);
  assert.equal(R.revenireScadenta({ ...baza, trimisLa: new Date("2026-11-06T10:00:00Z"), areRevenire: true }, acum), false);
  assert.equal(R.revenireScadenta({ ...baza, tip: "revenire", trimisLa: new Date("2026-11-06T10:00:00Z") }, acum), false);
  assert.equal(R.revenireScadenta({ ...baza, trimisLa: new Date("2026-09-01T10:00:00Z") }, acum), false);
});

// ===== Verificările ciornei =====
const text = "Bună ziua, doamna Popescu,\n\nVă scriu despre Firma Exemplu și despre cum putem colabora anul acesta, într-un mod simplu și fără costuri suplimentare pentru dumneavoastră. Am atașat prezentarea cu detalii.\n\nV-ar fi potrivit marți, între 10:00 și 12:00, pentru un apel scurt?";
const baza = { firma: "Firma Exemplu SRL", contactNume: "Andreea Popescu", subiect: "Colaborare cu Firma Exemplu", mesaj: text };
const coduri = (x) => R.verificaCiorna(x).map((p) => p.cod);

test("verificarea ciornei: un text bun nu are probleme", () => {
  assert.deepEqual(coduri(baza), []);
});

test("verificarea ciornei: lungime, subiect, salut, locuri de completat", () => {
  assert.ok(coduri({ ...baza, mesaj: "Bună ziua, doamna Popescu, scurt." }).includes("prea_scurt"));
  assert.ok(coduri({ ...baza, mesaj: `${text} ${"cuvânt ".repeat(200)}` }).includes("prea_lung"));
  assert.ok(coduri({ ...baza, subiect: "  " }).includes("subiect_gol"));
  assert.ok(coduri({ ...baza, mesaj: text.replace("Bună ziua, doamna Popescu,", "Vă scriu astăzi,") }).includes("salut_lipsa"));
  assert.ok(coduri({ ...baza, mesaj: `${text} [de completat]` }).includes("loc_de_completat"));
  assert.ok(coduri({ ...baza, mesaj: `${text} TODO` }).includes("loc_de_completat"));
  // salutul diferit de cel calculat doar atenționează
  const sch = R.verificaCiorna({ ...baza, salutAsteptat: "Bună ziua, domnule Popescu," }).find((p) => p.cod === "salut_schimbat");
  assert.equal(sch?.gravitate, "atentie");
});

test("verificarea ciornei: linkurile nepermise opresc trimiterea, cel al campaniei propuse trece", () => {
  assert.ok(coduri({ ...baza, mesaj: `${text}\nhttps://exemplu.ro/oferta` }).includes("link"));
  assert.ok(coduri({ ...baza, mesaj: `${text}\nVezi www.altceva.com` }).includes("link"));
  assert.ok(coduri({ ...baza, mesaj: `${text}\nVezi salveazaoinima.ro` }).includes("link"));
  const permis = "https://alexandrit.ro/strangere-fonduri/org/campanie";
  assert.ok(!coduri({ ...baza, mesaj: `${text}\nDetalii: ${permis}.`, linkuriPermise: [permis] }).includes("link"));
});

test("verificarea ciornei: numele altui coleg sau al altei firme din coadă", () => {
  assert.ok(coduri({ ...baza, mesaj: `${text}\nCu respect, Maria Ionescu`, alteNumeColegi: ["Maria Ionescu", "Ana"] }).includes("alt_coleg"));
  assert.ok(!coduri({ ...baza, alteNumeColegi: ["Maria Ionescu"] }).includes("alt_coleg"));
  assert.ok(coduri({ ...baza, mesaj: `${text} Colaborăm și cu Panificația Gustoasă.`, alteFirme: ["Panificația Gustoasă SRL"] }).includes("alta_firma"));
  assert.equal(R.areProbleme(R.verificaCiorna({ ...baza, mesaj: "Bună ziua, doamna Popescu, scurt." })), true);
  // fără numele firmei / destinatarului: doar atenționare, nu blocare
  const f = R.verificaCiorna({ ...baza, firma: "Altă Companie SRL" }).find((p) => p.cod === "firma_lipsa");
  assert.equal(f?.gravitate, "atentie");
});

test("verificarea revenirii: prag mai mic de lungime, nu cere numele firmei", () => {
  const rv = { ...baza, tip: "revenire", mesaj: "Bună ziua, doamna Popescu,\n\nRevin la emailul trimis acum câteva zile și rămân disponibilă pentru un apel scurt, joi între 10:00 și 12:00, dacă vă este potrivit.", firma: "Altă Companie SRL" };
  assert.deepEqual(coduri(rv), []);
});

// ===== Destinatarul =====
const c = (id, o = {}) => ({ id, nume: `Persoana ${id}`, rol: null, dept: null, email: `${id}@firma.ro`, acord: "necunoscut", cheie: false, emailStatus: null, creat: "2026-01-01T00:00:00.000Z", ...o });

test("destinatarul: contactul direct (inimioara) are prioritate; altfel decidentul cu cel mai bun rol", () => {
  const cu = R.alegeDestinatar([c("a", { rol: "Director General" }), c("b", { rol: "Contabil", cheie: true })], { doarCuAcord: false });
  assert.equal(cu.contact?.id, "b");
  const fara = R.alegeDestinatar([c("a", { rol: "Asistent" }), c("b", { rol: "Marketing Manager" }), c("d", { rol: "Administrator" }), c("e", { rol: "Director CSR" })], { doarCuAcord: false });
  assert.equal(fara.contact?.id, "d");
  assert.equal(R.alegeDestinatar([c("a", { rol: "Director CSR" }), c("b", { rol: "Marketing Manager" })], { doarCuAcord: false }).contact?.id, "a");
});

test("destinatarul: fără email valid, cu acord refuzat, suprimat, marcat invalid sau adresă automată nu se alege", () => {
  const lista = [c("1", { email: null, cheie: true }), c("2", { email: "nu-e-email", cheie: true }), c("3", { acord: "nu", cheie: true }), c("4", { emailStatus: "invalid", cheie: true }), c("5", { email: "noreply@firma.ro", cheie: true }), c("6", { email: "SUPRIMAT@firma.ro" })];
  const r = R.alegeDestinatar(lista, { doarCuAcord: false, suprimat: (e) => e === "suprimat@firma.ro" });
  assert.equal(r.contact, null);
  assert.deepEqual(
    r.respinse.map((x) => x.motiv),
    ["fara_email", "email_invalid", "acord_refuzat", "email_marcat_invalid", "adresa_generica", "suprimat"],
  );
});

test("destinatarul: „doar cu acord” cere acord explicit; acordul „da” e preferat în egalitate", () => {
  assert.equal(R.alegeDestinatar([c("a"), c("b", { acord: "da" })], { doarCuAcord: true }).contact?.id, "b");
  assert.equal(R.alegeDestinatar([c("a")], { doarCuAcord: true }).contact, null);
  assert.equal(R.alegeDestinatar([c("a"), c("b", { acord: "da" })], { doarCuAcord: false }).contact?.id, "b");
});

test("emailul e valid doar în forma obișnuită", () => {
  for (const ok of ["ana@firma.ro", "a.b+c@sub.firma.com"]) assert.equal(R.emailValid(ok), true, ok);
  for (const gresit of ["", "ana", "ana@firma", "ana@@firma.ro", "ana@fir..ma.ro", "ana @firma.ro", "<ana@firma.ro>"]) assert.equal(R.emailValid(gresit), false, gresit);
});

// ===== Eligibilitatea firmei =====
test("eligibilitatea firmei: ștearsă, respinsă, în contract sau scrisă recent opresc; sponsorii pot fi recontactați", () => {
  const acum = new Date("2026-11-04T10:00:00Z");
  const f = { status: "open", stage: "nou", tip: "prim" };
  assert.equal(R.firmaEligibila(f, acum), null);
  assert.equal(R.firmaEligibila({ ...f, stergeLa: "2026-10-01" }, acum), "stearsa");
  assert.equal(R.firmaEligibila({ ...f, status: "lost" }, acum), "respinsa");
  assert.equal(R.firmaEligibila({ ...f, stage: "contract_semnat" }, acum), "in_contract");
  assert.equal(R.firmaEligibila({ ...f, stage: "sponsorizat" }, acum), null);
  assert.equal(R.firmaEligibila({ ...f, ultimulPrimMail: new Date("2026-10-20T10:00:00Z") }, acum), "scris_recent");
  assert.equal(R.firmaEligibila({ ...f, ultimulPrimMail: new Date("2026-08-01T10:00:00Z") }, acum), null);
  // revenirea nu e blocată de etapă sau de emailul recent
  assert.equal(R.firmaEligibila({ ...f, tip: "revenire", stage: "contract_trimis", ultimulPrimMail: new Date("2026-11-01T10:00:00Z") }, acum), null);
});

// ===== Trimiterea =====
test("eroare de trimitere sigură sau nesigură: nu reîncercăm singuri când nu știm dacă a plecat", () => {
  assert.equal(R.esecSigurDeTrimitere({ code: "EAUTH" }), true);
  assert.equal(R.esecSigurDeTrimitere({ code: "ECONNREFUSED" }), true);
  assert.equal(R.esecSigurDeTrimitere({ responseCode: 550, command: "RCPT TO" }), true);
  assert.equal(R.esecSigurDeTrimitere({ code: "ETIMEDOUT", command: "CONN" }), true);
  assert.equal(R.esecSigurDeTrimitere({ code: "ETIMEDOUT", command: "DATA" }), false);
  assert.equal(R.esecSigurDeTrimitere({ code: "ESOCKET" }), false);
  assert.equal(R.esecSigurDeTrimitere(new Error("necunoscut")), false);
});

test("o trimitere „se_trimite” poate fi reluată abia după 10 minute", () => {
  const acum = new Date("2026-11-04T10:00:00Z");
  assert.equal(R.trimitereBlocata(new Date("2026-11-04T09:55:00Z"), acum), false);
  assert.equal(R.trimitereBlocata(new Date("2026-11-04T09:45:00Z"), acum), true);
  assert.equal(R.trimitereBlocata(null, acum), false);
});

test("Message-ID-ul poartă prefixul agentului și domeniul expeditorului", () => {
  const id = R.genereazaMessageId("123e4567-e89b-12d3-a456-426614174000", "Ana@Firma.RO");
  assert.equal(id, "<agt.123e4567e89b12d3a456426614174000@firma.ro>");
  assert.equal(R.esteMessageIdAgent(id), true);
  assert.equal(R.esteMessageIdAgent("<abc@gmail.com>"), false);
});

test("corpul emailului: textul se escapează, semnătura și subsolul se adaugă, pixelul doar când e cerut", () => {
  const h = R.corpEmailHtml('Bună ziua,\n\nUn <b>text</b> & "ghilimele".', "Ana Popescu\nCoordonator", { subsol: { text: "Răspundeți cu STOP.", linkDezabonare: "https://x.ro/dezabonare?o=1", etichetaLink: "dezabonare" } });
  assert.ok(h.includes("&lt;b&gt;text&lt;/b&gt; &amp; &quot;ghilimele&quot;"));
  assert.ok(h.includes("Ana Popescu<br>Coordonator"));
  assert.ok(h.includes("Răspundeți cu STOP.") && h.includes('href="https://x.ro/dezabonare?o=1"'));
  assert.ok(!h.includes("<img"));
  assert.ok(R.corpEmailHtml("x", "", { pixelUrl: "https://x.ro/p.gif" }).includes('<img src="https://x.ro/p.gif" width="1"'));
  assert.ok(R.corpEmailText("Salut", "Ana", { text: "STOP" }).includes("--\nSTOP"));
});

test("JSON-ul din răspunsul modelului se scoate chiar înconjurat de text sau de ```", () => {
  assert.deepEqual(R.extrageJson('Iată:\n```json\n{"mesaj": "ok"}\n```'), { mesaj: "ok" });
  assert.equal(R.extrageJson("fără json"), null);
  assert.equal(R.extrageJson("[1,2]"), null);
  assert.equal(R.extrageJson("{rupt"), null);
});

// ===== Prompturi =====
test("promptul de email: numele organizației, 8 stiluri, cazul public doar la mecanismul „caz”, indicațiile plafonate", () => {
  assert.equal(R.STILURI_EMAIL.length, 8);
  assert.ok(AI.systemEmail("Asociația Test").includes("Asociația Test"));
  assert.ok(/NU spune că e gratuită/.test(AI.systemEmail("X")));
  const cerere = {
    organizatie: "Asociația Test", firma: "Firma SRL", localitate: "Cluj-Napoca", judet: "Cluj", domeniu: "IT", site: null, nrAngajati: 12,
    destinatar: { nume: "Ana Popescu", rol: "Director" }, expeditor: { nume: "Vlad" }, mecanism: "sponsorizare",
    caz: { titlu: "Operație pentru Maria", localitate: "Cluj", judet: "Cluj", link: "https://x.ro/c", sumaTinta: 1000, sumaStransa: 200 },
    istoric: null, sezon: "Suntem în fereastra D177.", ferestre: [], sumaOrientativa: 12345, sumaEstimata: true, salut: "Bună ziua, doamna Popescu,",
    sloturi: "marți, între 10:00 și 12:00", stil: R.STILURI_EMAIL[0], deEvitat: [], instructiuni: "x".repeat(900),
  };
  const j = JSON.parse(AI.mesajEmail(cerere).replace(/^[^{]*/, ""));
  assert.equal(j.caz_public, null, "cazul nu se trimite când nu se propune un caz");
  assert.equal(j.suma_orientativa_lei, 12500);
  assert.equal(j.instructiuni_suplimentare.length, AI.MAX_INSTRUCTIUNI);
  const jc = JSON.parse(AI.mesajEmail({ ...cerere, mecanism: "caz" }).replace(/^[^{]*/, ""));
  assert.equal(jc.caz_public.link, "https://x.ro/c");
  assert.equal(jc.suma_orientativa_lei, null, "la un caz nu se menționează sume fiscale");
  assert.ok(!("poveste" in jc.caz_public) && !("diagnostic" in jc.caz_public));
});

test("răspunsul modelului: email valid cu două subiecte, subiect alternativ identic ignorat, JSON invalid refuzat", () => {
  const ok = AI.citesteEmail('{"subiect":"A","subiect_alt":"B","mesaj":"Text"}', R.extrageJson);
  assert.deepEqual(ok, { subiect: "A", subiectAlt: "B", mesaj: "Text" });
  assert.equal(AI.citesteEmail('{"subiect":"A","subiect_alt":"a","mesaj":"Text"}', R.extrageJson)?.subiectAlt, "");
  assert.equal(AI.citesteEmail('{"subiect":"","mesaj":"Text"}', R.extrageJson), null);
  assert.equal(AI.citesteEmail("nimic", R.extrageJson), null);
  assert.equal(AI.citesteRevenire('{"mesaj":" Revin "}', R.extrageJson), "Revin");
});

// ===== Răspunsuri =====
test("fragmentul răspunsului: fără textul citat și fără semnături de client", () => {
  const brut = "Mulțumesc, ne interesează.\nVorbim joi.\n\nPe 4 nov. 2026, X a scris:\n> text citat\n> alt rând";
  assert.equal(P.fragmentRaspuns(brut), "Mulțumesc, ne interesează.\nVorbim joi.");
  assert.equal(P.fragmentRaspuns("Da.\n\nOn Tue, Nov 3, 2026 Ana wrote:\n> x"), "Da.");
  assert.equal(P.fragmentRaspuns("a".repeat(5000)).length, 1200);
});

test("răspunsurile automate se recunosc după antete, subiect sau text scurt de concediu; un om care scrie mult nu e automat", () => {
  assert.equal(P.esteRaspunsAutomat({ antete: { autoSubmitted: "auto-replied" }, subiect: "Re: x", text: "ok" }), true);
  assert.equal(P.esteRaspunsAutomat({ antete: { autoSubmitted: "no" }, subiect: "Re: x", text: "ok" }), false);
  assert.equal(P.esteRaspunsAutomat({ antete: { precedence: "auto_reply" }, subiect: "Re: x", text: "ok" }), true);
  assert.equal(P.esteRaspunsAutomat({ antete: { xAutoreply: "yes" }, subiect: "Re: x", text: "ok" }), true);
  assert.equal(P.esteRaspunsAutomat({ antete: { returnPath: "<>" }, subiect: "Re: x", text: "ok" }), true);
  assert.equal(P.esteRaspunsAutomat({ subiect: "Automatic reply: Colaborare", text: "ok" }), true);
  assert.equal(P.esteRaspunsAutomat({ subiect: "Răspuns automat: Colaborare", text: "ok" }), true);
  assert.equal(P.esteRaspunsAutomat({ subiect: "Re: Colaborare", text: "Sunt în concediu până pe 12." }), true);
  assert.equal(P.esteRaspunsAutomat({ subiect: "Re: Colaborare", text: "x", deLa: "MAILER-DAEMON@mail.ro" }), true);
  assert.equal(P.esteRaspunsAutomat({ subiect: "Re: Colaborare", text: "Ne interesează, sunați-ne." }), false);
  assert.equal(P.esteRaspunsAutomat({ subiect: "Re: Colaborare", text: `Sunt în concediu dar ${"vorbim despre bugetul din acest an. ".repeat(30)}` }), false);
});

test("STOP / dezabonare se recunosc fără AI; etichetele modelului se normalizează", () => {
  assert.equal(P.etichetaRapida("Re: x", "STOP"), "stop");
  assert.equal(P.etichetaRapida("Re: x", "Vă rog nu mai trimiteți emailuri."), "stop");
  assert.equal(P.etichetaRapida("Re: x", "Stergeti-ma din lista voastră"), "stop");
  assert.equal(P.etichetaRapida("Re: x", "Nu mă interesează acum, poate în martie."), null);
  assert.equal(P.parseazaEticheta("interesat"), "interesat");
  assert.equal(P.parseazaEticheta("Nu_acum."), "nu_acum");
  assert.equal(P.parseazaEticheta("alt_contact"), "alt_contact");
  assert.equal(P.parseazaEticheta("mai_tarziu"), "nu_acum");
  assert.equal(P.parseazaEticheta("ceva neașteptat"), "altul");
});

test("Message-ID-urile din In-Reply-To / References se normalizează", () => {
  assert.deepEqual(P.idUri("<A@x.ro> <b@y.ro>"), ["<a@x.ro>", "<b@y.ro>"]);
  assert.deepEqual(P.idUri(["<A@x.ro>"]), ["<a@x.ro>"]);
  assert.deepEqual(P.idUri("c@z.ro"), ["<c@z.ro>"]);
  assert.deepEqual(P.idUri(undefined), []);
  assert.equal(P.subiectNormalizat("RE: Re[2]: Fwd: Colaborare Ședință"), "colaborare sedinta");
});

test("potrivirea pe fir: Message-ID exact; un răspuns la alt email al agentului nu se leagă de altceva; fără fir, după subiect și dată", () => {
  const m1 = { id: "1", messageId: "<agt.111@firma.ro>", subiect: "Colaborare", trimisLa: new Date("2026-11-02T10:00:00Z") };
  const m2 = { id: "2", messageId: "<agt.222@firma.ro>", subiect: "Colaborare", trimisLa: new Date("2026-11-03T10:00:00Z") };
  const dupa = new Date("2026-11-04T10:00:00Z");
  assert.equal(P.potrivesteMesaj({ fir: ["<agt.111@firma.ro>"], subiect: "Re: Colaborare", primitLa: dupa }, [m1, m2])?.id, "1");
  // citează un email al agentului care nu e în lista așteptată: nu îl atribuim altuia
  assert.equal(P.potrivesteMesaj({ fir: ["<agt.999@firma.ro>"], subiect: "Re: Colaborare", primitLa: dupa }, [m1, m2]), null);
  // fără antete de fir: același subiect, cel mai recent trimis înaintea răspunsului
  assert.equal(P.potrivesteMesaj({ fir: [], subiect: "Re: Colaborare", primitLa: dupa }, [m1, m2])?.id, "2");
  // serverul a rescris Message-ID-ul (citează un id străin): tot după subiect
  assert.equal(P.potrivesteMesaj({ fir: ["<altceva@mail.google.com>"], subiect: "RE: Colaborare", primitLa: dupa }, [m1])?.id, "1");
  // alt subiect sau răspuns mai vechi decât emailul: niciun rezultat
  assert.equal(P.potrivesteMesaj({ fir: [], subiect: "Re: Altceva", primitLa: dupa }, [m1, m2]), null);
  assert.equal(P.potrivesteMesaj({ fir: [], subiect: "Re: Colaborare", primitLa: new Date("2026-11-01T10:00:00Z") }, [m1, m2]), null);
});

// ===== Căsuța utilizatorului =====
test("servere acceptate: fără localhost, rețele private, metadate cloud sau nume interne", () => {
  for (const interzis of ["localhost", "127.0.0.1", "10.0.0.5", "192.168.1.10", "172.16.0.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "::ffff:10.0.0.1", "mail.local", "db.internal", "smtp"]) {
    assert.equal(N.esteHostInterzis(interzis), true, interzis);
  }
  for (const ok of ["smtp.gmail.com", "mail.firma.ro", "imap.office365.com", "8.8.8.8"]) assert.equal(N.esteHostInterzis(ok), false, ok);
  assert.equal(N.esteIpPrivat("172.32.0.1"), false);
  assert.equal(N.esteIpPrivat("999.1.1.1"), true);
});

test("validarea formularului de căsuță: adresă, servere, porturi, parolă; utilizatorul implicit e adresa", () => {
  const ok = N.valideazaDateCont({ adresa: " Ana@Firma.ro ", smtpHost: "smtp.firma.ro", smtpPort: 465, imapHost: "imap.firma.ro", imapPort: 993, parola: "secret" }, false);
  assert.equal(ok.ok, true);
  assert.equal(ok.date.adresa, "ana@firma.ro");
  assert.equal(ok.date.smtpUser, "ana@firma.ro");
  const rau = N.valideazaDateCont({ adresa: "nu-e-email", smtpHost: "localhost", smtpPort: 25, imapHost: "10.1.1.1", imapPort: 995, parola: "" }, false);
  assert.equal(rau.ok, false);
  assert.deepEqual(rau.erori.sort(), ["adresa", "imap_host", "imap_port", "parola", "smtp_host", "smtp_port"]);
  // cu parolă deja salvată, parola goală e permisă (rămâne cea veche)
  assert.equal(N.valideazaDateCont({ adresa: "a@f.ro", smtpHost: "smtp.f.ro", smtpPort: 587, imapHost: "imap.f.ro", imapPort: 143, parola: "" }, true).ok, true);
  assert.equal(N.valideazaDateCont({ adresa: "a@f.ro", smtpHost: "smtp.f.ro", smtpPort: 587, imapHost: "imap.f.ro", imapPort: 143, parola: "a\nb" }, true).ok, false);
});

test("sugestii de servere pentru furnizorii cunoscuți; parola nu apare în erori", () => {
  assert.equal(N.sugereazaServere("ana@gmail.com")?.smtpHost, "smtp.gmail.com");
  assert.equal(N.sugereazaServere("ana@outlook.com")?.imapHost, "outlook.office365.com");
  assert.equal(N.sugereazaServere("ana@firma-proprie.ro"), null);
  assert.equal(N.ascundeSecret("AUTH failed for parola123 on server", "parola123"), "AUTH failed for ••• on server");
});

test("semnătura: curățată, maximum 8 rânduri de 120 de caractere", () => {
  assert.equal(R.curataSemnatura("  Ana  \n\n Coordonator \r\n0722"), "Ana\nCoordonator\n0722");
  assert.equal(R.curataSemnatura(Array.from({ length: 20 }, (_, i) => `r${i}`).join("\n")).split("\n").length, 8);
  assert.equal(R.semnaturaHtml(""), "");
});
