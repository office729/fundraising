import { test } from "node:test";
import assert from "node:assert/strict";

const C = await import("../src/lib/curatare-contacte.ts");

const e = (x) => C.evalueazaEmail(x);

test("e-mail: adresele bune rămân neschimbate; majusculele și spațiile din jur nu sunt „corectări”", () => {
  for (const ok of ["ion.popescu@gmail.com", "maria@firma.ro", "a+b@yahoo.com", "Ana.Ionescu@Yahoo.RO", "  office@asociatie.org  "]) {
    const r = e(ok);
    assert.equal(r.stare, "valid", ok);
    assert.equal(r.email, ok.trim().toLowerCase());
    assert.equal(r.motiv, null);
  }
});

test("e-mail: greșelile tipice la furnizorii mari se corectează și se spune ce s-a schimbat", () => {
  const cazuri = [
    ["ion@gmial.com", "ion@gmail.com"],
    ["ion@gmai.com", "ion@gmail.com"],
    ["ion@gmaill.com", "ion@gmail.com"],
    ["ion@gamil.com", "ion@gmail.com"],
    ["ion@gnail.com", "ion@gmail.com"],
    ["ion@gmail.con", "ion@gmail.com"],
    ["ion@gmail.ro", "ion@gmail.com"],
    ["ion@gmail.co", "ion@gmail.com"],
    ["ion@gmail", "ion@gmail.com"],
    ["ion@yaho.ro", "ion@yahoo.ro"],
    ["ion@yahooo.com", "ion@yahoo.com"],
    ["ion@yahoo.con", "ion@yahoo.com"],
    ["ion@hotmial.com", "ion@hotmail.com"],
    ["ion@outlok.com", "ion@outlook.com"],
    ["ion@iclod.com", "ion@icloud.com"],
  ];
  for (const [dat, asteptat] of cazuri) {
    const r = e(dat);
    assert.equal(r.stare, "corectat", dat);
    assert.equal(r.email, asteptat, dat);
    assert.match(r.motiv, /corectat|completat/, dat);
  }
});

test("e-mail: domeniile reale apropiate de furnizori și cele ale organizațiilor nu se ating", () => {
  for (const d of ["mail.com", "cloud.com", "email.ro", "gmx.com", "live.com", "yahoo.fr", "hotmail.it", "yahoo.co.uk", "gmailing.ro", "asociatia-lumina.ro", "outlook.ro"]) {
    const r = e(`ion@${d}`);
    assert.equal(r.stare, "valid", d);
    assert.equal(r.email, `ion@${d}`, d);
  }
});

test("e-mail: spații, semne din jur, „mailto:” și mai multe adrese în aceeași celulă", () => {
  assert.deepEqual([e("ion @gmail.com").email, e("ion @gmail.com").stare], ["ion@gmail.com", "corectat"]);
  assert.equal(e("<ion@firma.ro>").email, "ion@firma.ro");
  assert.equal(e("mailto:ion@firma.ro").email, "ion@firma.ro");
  assert.equal(e("ion@firma.ro.").email, "ion@firma.ro");
  const multe = e("ion@firma.ro; maria@alta.ro");
  assert.equal(multe.email, "ion@firma.ro");
  assert.equal(multe.stare, "corectat");
  assert.match(multe.motiv, /Mai multe adrese/);
});

test("e-mail: adrese imposibile sau fictive sunt invalide, cu motivul spus", () => {
  const cazuri = [
    ["", /lipsă/],
    ["fara arond", /@/],
    ["a@b@c.ro", /mai multe @/],
    ["@firma.ro", /nimic înainte/],
    ["ion@", /domeniu/],
    ["ion@firma", /terminație/],
    ["ion@firma.r", /Terminația/],
    ["ion@firma.123", /Terminația/],
    ["ioană@firma.ro", /diacritice/],
    ["test@test.com", /exemplu|fictivă/],
    ["nu@are.ro", /fictivă/],
    ["fara@email.ro", /fictivă/],
    ["aaaaa@firma.ro", /fictivă/],
    ["ion@example.com", /exemplu/],
  ];
  for (const [dat, motiv] of cazuri) {
    const r = e(dat);
    assert.equal(r.stare, "invalid", dat);
    assert.equal(r.email, "");
    assert.match(r.motiv, motiv, dat);
  }
});

test("e-mail: adresele de birou sunt marcate generice (info@, office@…), nu invalide", () => {
  for (const g of ["info@firma.ro", "office@firma.ro", "contact@firma.ro", "no-reply@firma.ro", "secretariat@scoala.ro"]) {
    const r = e(g);
    assert.equal(r.stare, "valid", g);
    assert.equal(r.generic, true, g);
  }
  assert.equal(e("ion.popescu@firma.ro").generic, false);
});

test("nume: majuscule corecte pentru TOT MARE sau tot mic; un nume deja bine scris rămâne cum e", () => {
  assert.deepEqual(C.curataNume("POPESCU ION"), { nume: "Popescu Ion", schimbat: true });
  assert.deepEqual(C.curataNume("maria ionescu"), { nume: "Maria Ionescu", schimbat: true });
  assert.deepEqual(C.curataNume("POPESCU-IONESCU ANA"), { nume: "Popescu-Ionescu Ana", schimbat: true });
  assert.deepEqual(C.curataNume("ȘTEFAN ȚIGĂNUȘ"), { nume: "Ștefan Țigănuș", schimbat: true });
  assert.deepEqual(C.curataNume("Ion Popescu"), { nume: "Ion Popescu", schimbat: false });
  assert.deepEqual(C.curataNume("Ana-Maria McDonald"), { nume: "Ana-Maria McDonald", schimbat: false });
  assert.deepEqual(C.curataNume("  Ion   Popescu "), { nume: "Ion Popescu", schimbat: true });
  assert.equal(C.curataNume("ion@gmail.com").nume, "", "o adresă de e-mail în câmpul de nume nu e un nume");
  assert.equal(C.curataNume("12345").nume, "");
  assert.equal(C.curataNume("A").nume, "");
});

test("telefon: România în orice scriere ajunge la aceeași formă; numerele străine se păstrează; cele imposibile sunt invalide", () => {
  const forme = ["0757 401 042", "0757401042", "+40757401042", "+40 757 401 042", "0040757401042", "757401042", "07-57.40.10.42", "+40 (0) 757 401 042", "0757 401 042 int. 12"];
  for (const f of forme) {
    const t = C.curataTelefon(f);
    assert.equal(t.valid, true, f);
    assert.equal(t.canonic, "+40757401042", f);
    assert.equal(t.afisat, "0757 401 042", f);
    assert.equal(t.tip, "mobil", f);
  }
  const fix = C.curataTelefon("021 123 4567");
  assert.deepEqual([fix.valid, fix.canonic, fix.tip], [true, "+40211234567", "fix"]);
  const strain = C.curataTelefon("+44 20 7946 0958");
  assert.deepEqual([strain.valid, strain.canonic, strain.tip], [true, "+442079460958", "strain"]);
  for (const rau of ["", "123", "abc", "0757 401", "+40 12 34", "0999999999"]) assert.equal(C.curataTelefon(rau).valid, false, rau);
});

test("e-mail canonic: fără +eticheta, iar la Gmail fără puncte", () => {
  assert.equal(C.emailCanonic("Ion.Popescu+donatii@Gmail.com"), "ionpopescu@gmail.com");
  assert.equal(C.emailCanonic("ion.popescu@firma.ro"), "ion.popescu@firma.ro");
  assert.equal(C.emailCanonic("ion@googlemail.com"), "ion@gmail.com");
});

test("dubluri: același e-mail (în variante) = încredere mare", () => {
  const g = C.gasesteDubluri([
    { id: "1", nume: "Ion Popescu", email: "ion.popescu@gmail.com" },
    { id: "2", nume: "I. Popescu", email: "ionpopescu+ong@gmail.com" },
    { id: "3", nume: "Maria Ionescu", email: "maria@firma.ro" },
  ]);
  assert.equal(g.length, 1);
  assert.deepEqual(g[0].ids.sort(), ["1", "2"]);
  assert.equal(g[0].incredere, "mare");
  assert.deepEqual(g[0].motive, ["email"]);
});

test("dubluri: același telefon cu nume asemănătoare = mare; cu nume diferite (familie, birou) = medie", () => {
  const mare = C.gasesteDubluri([
    { id: "1", nume: "Ion Popescu", telefon: "0757 401 042" },
    { id: "2", nume: "Popescu Ion", telefon: "+40757401042" },
  ]);
  assert.equal(mare[0].incredere, "mare");
  const medie = C.gasesteDubluri([
    { id: "1", nume: "Ion Popescu", telefon: "0757 401 042" },
    { id: "2", nume: "Maria Dumitrescu", telefon: "0757401042" },
  ]);
  assert.equal(medie[0].incredere, "medie");
});

test("dubluri: același nume (în aceeași ordine) și aceeași localitate = medie; fără localitate sau cu un singur cuvânt nu se propune nimic", () => {
  const g = C.gasesteDubluri([
    { id: "1", nume: "Ion Popescu", localitate: "Cluj-Napoca" },
    { id: "2", nume: "ION POPESCU", localitate: "cluj napoca" },
  ]);
  assert.equal(g.length, 1);
  assert.equal(g[0].incredere, "medie");
  assert.deepEqual(g[0].motive, ["nume+localitate"]);
  assert.equal(C.gasesteDubluri([{ id: "1", nume: "Ion Popescu" }, { id: "2", nume: "Ion Popescu" }]).length, 0, "fără localitate e prea slab");
  assert.equal(C.gasesteDubluri([{ id: "1", nume: "Ion", localitate: "Iași" }, { id: "2", nume: "Ion", localitate: "Iași" }]).length, 0, "un singur cuvânt nu identifică o persoană");
  assert.equal(C.gasesteDubluri([{ id: "1", nume: "Ion Popescu", localitate: "Iași" }, { id: "2", nume: "Ion Popescu", localitate: "Cluj" }]).length, 0, "aceeași denumire, orașe diferite");
});

test("dubluri: grupurile se leagă în lanț (A=B după e-mail, B=C după telefon) și se ordonează cu încrederea mare întâi", () => {
  const g = C.gasesteDubluri([
    { id: "A", nume: "Ana Pop", email: "ana@x.ro" },
    { id: "B", nume: "Ana Pop", email: "ana+2@x.ro", telefon: "0722 111 222" },
    { id: "C", nume: "Ana Popa", telefon: "0722111222" },
    { id: "D", nume: "Ion Rus", localitate: "Sibiu" },
    { id: "E", nume: "Ion Rus", localitate: "Sibiu" },
  ]);
  assert.equal(g.length, 2);
  assert.deepEqual(g[0].ids.sort(), ["A", "B", "C"]);
  assert.equal(g[0].incredere, "mare");
  assert.equal(g[1].incredere, "medie");
});

test("dubluri: ordinea inversă a numelui nu e destul (Andrei Radu și Radu Andrei pot fi persoane diferite)", () => {
  assert.equal(C.gasesteDubluri([{ id: "1", nume: "Andrei Radu", localitate: "Iași" }, { id: "2", nume: "Radu Andrei", localitate: "Iași" }]).length, 0);
  // dar același telefon le leagă tot
  const g = C.gasesteDubluri([{ id: "1", nume: "Andrei Radu", telefon: "0757401042" }, { id: "2", nume: "Radu Andrei", telefon: "0757 401 042" }]);
  assert.equal(g.length, 1);
});

test("dubluri: două telefoane valide diferite sunt dovada că nu e aceeași persoană (la nume + localitate)", () => {
  const g = C.gasesteDubluri([
    { id: "1", nume: "Maria Ionescu", localitate: "Iași", telefon: "0757 401 042" },
    { id: "2", nume: "Maria Ionescu", localitate: "Iași", telefon: "0722 333 444" },
  ]);
  assert.equal(g.length, 0);
  // un singur telefon cunoscut nu e dovadă negativă
  assert.equal(C.gasesteDubluri([{ id: "1", nume: "Maria Ionescu", localitate: "Iași", telefon: "0757 401 042" }, { id: "2", nume: "Maria Ionescu", localitate: "Iași" }]).length, 1);
});

test("dubluri: un nume frecvent în aceeași localitate (5+) și un telefon partajat (5+) nu se propun", () => {
  const nume = Array.from({ length: 5 }, (_, i) => ({ id: "n" + i, nume: "Ion Popescu", localitate: "București" }));
  assert.equal(C.gasesteDubluri(nume).length, 0);
  const telefon = Array.from({ length: 5 }, (_, i) => ({ id: "t" + i, nume: "Persoana " + i, telefon: "0212 000 111" }));
  assert.equal(C.gasesteDubluri(telefon).length, 0);
  const patru = Array.from({ length: 4 }, (_, i) => ({ id: "p" + i, nume: "Ion Popescu", telefon: "0757 401 042" }));
  assert.equal(C.gasesteDubluri(patru).length, 1);
});

test("telefon: numerele de umplutură nu sunt valide, iar din mai multe numere rămâne primul", () => {
  for (const x of ["0700 000 000", "0722222222", "0712 345 678", "0723456789", "0798765432"]) assert.equal(C.curataTelefon(x).valid, false, x);
  assert.equal(C.curataTelefon("0757 401 042").valid, true);
  const doua = C.curataTelefon("0757 401 042 / 0722 111 333");
  assert.equal(doua.valid, true);
  assert.equal(doua.canonic, "+40757401042");
  assert.equal(C.curataTelefon("0757 401 042 sau 0722 111 333").canonic, "+40757401042");
});

test("celule enorme nu blochează funcția (ReDoS): e-mail și nume se taie înainte de regexuri", () => {
  const t0 = Date.now();
  const mare = "x@" + ".".repeat(500_000) + "a";
  assert.equal(C.evalueazaEmail(mare).stare === "invalid" || C.evalueazaEmail(mare).stare === "corectat" || C.evalueazaEmail(mare).stare === "valid", true);
  C.curataNume(" ".repeat(300_000) + "a" + ".".repeat(300_000));
  C.curataTelefon("1".repeat(1_000_000));
  assert.ok(Date.now() - t0 < 1500, "durează prea mult: " + (Date.now() - t0) + " ms");
});
