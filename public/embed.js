/*
 * Widget de donație Alexandrit — se lipește pe site-ul organizației.
 *
 *   <div data-alexandrit-doneaza data-org="slug-organizatie" data-campanie="slug-campanie"
 *        data-mod="buton" data-text="Donează" data-culoare="#2e8b57"></div>
 *   <script async src="https://alexandrit.ro/embed.js"></script>
 *
 * data-mod="buton"  → un buton; la apăsare se deschide formularul într-o fereastră peste pagină.
 * data-mod="inline" → formularul apare direct în pagină.
 *
 * Formularul rulează într-un iframe pe domeniul Alexandrit; plata se face pe pagina Stripe, pe care o deschide această pagină
 * (un iframe nu poate deschide Stripe). Scriptul nu folosește cookie-uri și nu citește nimic din pagina gazdă, în afară de numele ei
 * de domeniu, trimis ca etichetă de sursă (utm_campaign), ca organizația să vadă de unde vin donațiile.
 */
(function () {
  "use strict";
  var script = document.currentScript;
  if (!script || !script.src) return;
  var ORIGIN = new URL(script.src).origin;
  // Singurul loc unde acest script poate trimite vizitatorul după o donație.
  var GAZDE_PLATA = ["checkout.stripe.com"];
  var iframes = [];

  function slugValid(s) {
    return typeof s === "string" && /^[a-z0-9][a-z0-9-]{0,80}$/i.test(s);
  }

  function adresaFormular(org, campanie) {
    var sursa = (location.hostname || "").toLowerCase().replace(/^www[.]/, "").replace(/[^a-z0-9.-]/g, "").slice(0, 60);
    var q = "utm_source=widget&utm_medium=embed" + (sursa ? "&utm_campaign=" + encodeURIComponent(sursa) : "");
    return ORIGIN + "/strangere-fonduri/" + encodeURIComponent(org) + "/" + encodeURIComponent(campanie) + "/embed?" + q;
  }

  function creeazaIframe(org, campanie) {
    var f = document.createElement("iframe");
    f.src = adresaFormular(org, campanie);
    f.title = "Formular de donație";
    f.setAttribute("loading", "lazy");
    f.setAttribute("allow", "payment");
    f.style.cssText = "width:100%;border:0;display:block;min-height:420px;background:transparent;color-scheme:normal";
    iframes.push(f);
    return f;
  }

  function dinAtribute(el) {
    return { org: el.getAttribute("data-org"), campanie: el.getAttribute("data-campanie"), mod: el.getAttribute("data-mod") || "buton", text: el.getAttribute("data-text") || "Donează", culoare: el.getAttribute("data-culoare") || "" };
  }

  function culoareValida(c) {
    return /^#[0-9a-f]{6}$/i.test(c) ? c : "#2e8b57";
  }

  // Text alb pe fundal închis, text închis pe fundal deschis (luminanța relativă WCAG), ca butonul să rămână lizibil cu orice culoare aleasă.
  function culoareText(hex) {
    var canal = function (i) {
      var v = parseInt(hex.substr(i, 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    var l = 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5);
    return l > 0.4 ? "#0f172a" : "#ffffff";
  }

  function injecteazaStil() {
    if (document.getElementById("alexandrit-stil")) return;
    var st = document.createElement("style");
    st.id = "alexandrit-stil";
    st.textContent = ".alexandrit-btn:focus-visible,.alexandrit-inchide:focus-visible{outline:3px solid #1d4ed8;outline-offset:2px}";
    document.head.appendChild(st);
  }

  function deschideFereastra(cfg) {
    var fundal = document.createElement("div");
    fundal.setAttribute("role", "dialog");
    fundal.setAttribute("aria-modal", "true");
    fundal.setAttribute("aria-label", "Donează");
    fundal.style.cssText = "position:fixed;inset:0;z-index:2147483000;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:12px;overflow:auto";
    var cutie = document.createElement("div");
    cutie.style.cssText = "position:relative;width:100%;max-width:460px;max-height:96vh;overflow:auto;background:#fff;border-radius:14px;box-shadow:0 20px 50px rgba(0,0,0,.3)";
    var inchide = document.createElement("button");
    inchide.type = "button";
    inchide.textContent = "×";
    inchide.setAttribute("aria-label", "Închide");
    inchide.style.cssText = "position:absolute;top:6px;right:8px;z-index:2;border:0;background:#ffffff;border-radius:6px;width:36px;height:36px;font-size:26px;line-height:1;cursor:pointer;color:#334155";
    inchide.className = "alexandrit-inchide";
    var f = creeazaIframe(cfg.org, cfg.campanie);
    var anterior = document.activeElement;
    var overflowVechi = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Indicator până se încarcă formularul.
    var incarcare = document.createElement("p");
    incarcare.textContent = "Se încarcă formularul…";
    incarcare.style.cssText = "position:absolute;top:50%;left:0;right:0;margin:0;text-align:center;color:#475569;font:14px system-ui,sans-serif";
    f.addEventListener("load", function () {
      incarcare.remove();
    });
    function inchideTot() {
      document.removeEventListener("keydown", laTasta);
      var i = iframes.indexOf(f);
      if (i >= 0) iframes.splice(i, 1);
      fundal.remove();
      document.body.style.overflow = overflowVechi;
      if (anterior && anterior.focus) anterior.focus();
    }
    // Escape închide; Tab rămâne în fereastră (butonul de închidere și formularul), nu iese în pagina gazdă.
    function laTasta(e) {
      if (e.key === "Escape") {
        inchideTot();
        return;
      }
      if (e.key !== "Tab") return;
      var activ = document.activeElement;
      if (e.shiftKey && activ === inchide) {
        e.preventDefault();
        f.focus();
      } else if (!e.shiftKey && activ === f) {
        e.preventDefault();
        inchide.focus();
      } else if (activ !== inchide && activ !== f) {
        e.preventDefault();
        inchide.focus();
      }
    }
    inchide.addEventListener("click", inchideTot);
    fundal.addEventListener("click", function (e) {
      if (e.target === fundal) inchideTot();
    });
    document.addEventListener("keydown", laTasta);
    cutie.appendChild(inchide);
    cutie.appendChild(incarcare);
    cutie.appendChild(f);
    fundal.appendChild(cutie);
    document.body.appendChild(fundal);
    inchide.focus();
  }

  function monteaza(el) {
    if (el.getAttribute("data-alexandrit-gata")) return;
    var cfg = dinAtribute(el);
    if (!slugValid(cfg.org) || !slugValid(cfg.campanie)) {
      console.warn("Alexandrit: lipsesc data-org sau data-campanie valide.");
      return;
    }
    el.setAttribute("data-alexandrit-gata", "1");
    if (cfg.mod === "inline") {
      el.appendChild(creeazaIframe(cfg.org, cfg.campanie));
      return;
    }
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = cfg.text.slice(0, 40);
    injecteazaStil();
    var fundalButon = culoareValida(cfg.culoare);
    b.className = "alexandrit-btn";
    b.setAttribute("aria-haspopup", "dialog");
    b.style.cssText = "cursor:pointer;border:0;border-radius:8px;padding:12px 24px;font:600 16px/1.2 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:" + culoareText(fundalButon) + ";background:" + fundalButon;
    b.addEventListener("click", function () {
      deschideFereastra(cfg);
    });
    el.appendChild(b);
  }

  window.addEventListener("message", function (e) {
    if (e.origin !== ORIGIN || !e.data || typeof e.data !== "object") return;
    var cadru = null;
    for (var i = 0; i < iframes.length; i++) {
      if (iframes[i].contentWindow === e.source) cadru = iframes[i];
    }
    if (!cadru) return;
    if (e.data.type === "alexandrit:height" && typeof e.data.height === "number" && e.data.height > 0) {
      cadru.style.height = Math.min(Math.ceil(e.data.height), 4000) + "px";
    } else if (e.data.type === "alexandrit:redirect" && typeof e.data.url === "string") {
      try {
        var u = new URL(e.data.url);
        if (u.protocol === "https:" && GAZDE_PLATA.indexOf(u.hostname) >= 0) window.location.href = u.toString();
      } catch (err) {
        /* adresă invalidă: se ignoră */
      }
    }
  });

  function porneste() {
    var elemente = document.querySelectorAll("[data-alexandrit-doneaza]");
    for (var i = 0; i < elemente.length; i++) monteaza(elemente[i]);
    // Varianta scurtă: atributele pe eticheta <script> însăși; widgetul apare chiar după ea.
    if (!elemente.length && script.getAttribute("data-org") && script.getAttribute("data-campanie")) {
      var loc = document.createElement("div");
      loc.setAttribute("data-alexandrit-doneaza", "");
      ["data-org", "data-campanie", "data-mod", "data-text", "data-culoare"].forEach(function (a) {
        if (script.getAttribute(a)) loc.setAttribute(a, script.getAttribute(a));
      });
      script.parentNode.insertBefore(loc, script.nextSibling);
      monteaza(loc);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", porneste);
  else porneste();
})();
