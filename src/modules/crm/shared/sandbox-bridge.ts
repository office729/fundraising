// Punte între aplicație (gazda) și instrumentele HTML rulate în iframe SANDBOXED.
//
// De ce: instrumentele sunt cod mare, scris separat; dacă rulează pe aceeași origine
// ca aplicația (iframe fără sandbox), un XSS în ele poate citi cookie-urile și
// sesiunea Supabase din localStorage. Cu `sandbox` fără `allow-same-origin`, iframe-ul
// primește o origine opacă: nu mai poate atinge nimic din aplicație. Ca instrumentele
// să meargă neschimbat, li se injectează un shim care:
//   - înlocuiește localStorage/sessionStorage cu o copie în memorie (inițializată din
//     datele existente ale organizației) și trimite fiecare scriere gazdei, care o
//     persistă în localStorage-ul real, sub aceleași chei ca până acum;
//   - înlocuiește fetch cu un proxy prin gazdă, care acceptă doar /api/<org>/… (cu
//     cookie-urile utilizatorului) și adrese https externe (fără cookie-uri);
//   - oferă un `window.parent.location` simulat (search/pathname ale paginii gazdă).
// Partea de shim rulează în iframe; funcțiile `handeazaMesaj*` rulează în gazdă.

export type ShimConfig = {
  snap: Record<string, string>;
  host: { origin: string; pathname: string; search: string; href: string };
};

// Chei care NU intră niciodată în iframe (sesiunea de autentificare etc.).
const EXCLUSE = /^(sb-|supabase)|auth-token|access[_-]?token|refresh[_-]?token/i;

export function citesteSnapshot(storage: Storage): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (k && !EXCLUSE.test(k)) {
        const v = storage.getItem(k);
        if (v != null) out[k] = v;
      }
    }
  } catch {
    /* stocare blocată — instrumentul pornește gol */
  }
  return out;
}

export function scriereAcceptata(k: string): boolean {
  return typeof k === "string" && k.length > 0 && k.length < 256 && !EXCLUSE.test(k);
}

// ---------------------------------------------------------------------------------
// Shimul injectat în iframe (ES5, rulează înaintea codului instrumentului).
const SHIM_SOURCE = `(function(){
var C=/*CFG*/;
var P=window.parent;
function post(m){m.fa=1;try{P.postMessage(m,'*');}catch(e){}}
function makeStore(init,persist){
  var d={};for(var k in init){if(Object.prototype.hasOwnProperty.call(init,k))d[k]=init[k];}
  return {
    getItem:function(k){k=String(k);return Object.prototype.hasOwnProperty.call(d,k)?d[k]:null;},
    setItem:function(k,v){k=String(k);v=String(v);d[k]=v;if(persist)post({t:'ls-set',k:k,v:v});},
    removeItem:function(k){k=String(k);delete d[k];if(persist)post({t:'ls-del',k:k});},
    clear:function(){d={};if(persist)post({t:'ls-clear'});},
    key:function(i){var ks=Object.keys(d);return i<ks.length?ks[i]:null;},
    get length(){return Object.keys(d).length;}
  };
}
try{Object.defineProperty(window,'localStorage',{value:makeStore(C.snap,true),configurable:true});}catch(e){}
try{Object.defineProperty(window,'sessionStorage',{value:makeStore({},false),configurable:true});}catch(e){}
try{Object.defineProperty(window,'parent',{value:{location:C.host,postMessage:function(){}},configurable:true});}catch(e){}
var seq=0,pend={};
window.addEventListener('message',function(ev){
  var m=ev.data;if(!m||m.fa!==1||m.t!=='fetch-res'||ev.source!==P)return;
  var p=pend[m.id];if(!p)return;delete pend[m.id];p(m);
});
window.fetch=function(input,init){
  init=init||{};
  var url=typeof input==='string'?input:(input&&input.url)||String(input);
  var abs;try{abs=new URL(url,C.host.origin+'/').href;}catch(e){return Promise.reject(new TypeError('URL invalid'));}
  var hdr={};
  var h=init.headers||(input&&input.headers);
  if(h){if(typeof h.forEach==='function'&&!Array.isArray(h)){h.forEach(function(v,k){hdr[k]=v;});}
    else if(Array.isArray(h)){h.forEach(function(kv){hdr[kv[0]]=kv[1];});}
    else{for(var k in h)hdr[k]=h[k];}}
  var body=init.body;
  if(body!=null&&typeof body!=='string')body=String(body);
  var id=++seq,sig=init.signal;
  return new Promise(function(resolve,reject){
    function abort(){delete pend[id];post({t:'fetch-abort',id:id});var e=new Error('Aborted');e.name='AbortError';reject(sig&&sig.reason&&sig.reason.name==='TimeoutError'?sig.reason:e);}
    if(sig){if(sig.aborted)return abort();sig.addEventListener('abort',abort);}
    pend[id]=function(m){
      if(m.error){reject(new TypeError(m.error));return;}
      var nb=(m.status===204||m.status===205||m.status===304)?null:m.body;
      resolve(new Response(nb,{status:m.status,statusText:m.statusText||'',headers:m.headers||[]}));
    };
    post({t:'fetch',id:id,url:abs,method:(init.method||'GET').toUpperCase(),headers:hdr,body:body,cache:init.cache});
  });
};
})();`;

export function shimHtml(cfg: ShimConfig): string {
  // Escapăm "<" și separatorii de linie Unicode, ca date cu "</script>" să nu poată închide tag-ul.
  const json = JSON.stringify(cfg).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  return `<script>${SHIM_SOURCE.replace("/*CFG*/", () => json)}</script>`;
}

// Pune shimul cât mai sus în document (înaintea oricărui script al instrumentului).
export function injecteazaShim(html: string, cfg: ShimConfig): string {
  const shim = shimHtml(cfg);
  const m = /<head[^>]*>/i.exec(html);
  if (m) return html.slice(0, m.index + m[0].length) + shim + html.slice(m.index + m[0].length);
  return shim + html;
}

// ---------------------------------------------------------------------------------
// Partea din gazdă.
type Raspuns = Record<string, unknown>;

export type FetchMsg = { fa: 1; t: "fetch"; id: number; url: string; method: string; headers: Record<string, string>; body?: string; cache?: string };

const METODE = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);
const MAX_BODY = 4 * 1024 * 1024;

// Decide dacă un apel al instrumentului e permis și cu ce credențiale.
export function politicaFetch(urlStr: string, orgSlug: string, hostOrigin: string): { ok: true; credentials: RequestCredentials } | { ok: false; error: string } {
  let u: URL;
  try {
    u = new URL(urlStr);
  } catch {
    return { ok: false, error: "URL invalid" };
  }
  if (u.origin === hostOrigin) {
    // doar API-ul organizației curente
    if (u.pathname.startsWith(`/api/${orgSlug}/`)) return { ok: true, credentials: "same-origin" };
    return { ok: false, error: "Cerere blocată: instrumentul poate apela doar API-ul organizației." };
  }
  if (u.protocol === "https:") return { ok: true, credentials: "omit" };
  return { ok: false, error: "Cerere blocată: doar adrese https." };
}

const controllere = new Map<number, AbortController>();

export async function handeazaFetch(m: FetchMsg, orgSlug: string, hostOrigin: string): Promise<Raspuns> {
  const base = { fa: 1, t: "fetch-res", id: m.id };
  const metoda = METODE.has(m.method) ? m.method : "GET";
  const pol = politicaFetch(m.url, orgSlug, hostOrigin);
  if (!pol.ok) return { ...base, error: pol.error };
  if (m.body && m.body.length > MAX_BODY) return { ...base, error: "Corp prea mare" };
  const ctrl = new AbortController();
  controllere.set(m.id, ctrl);
  try {
    const r = await fetch(m.url, {
      method: metoda,
      headers: m.headers,
      body: metoda === "GET" ? undefined : m.body,
      credentials: pol.credentials,
      cache: m.cache === "no-store" ? "no-store" : undefined,
      signal: ctrl.signal,
    });
    const body = await r.text();
    return { ...base, status: r.status, statusText: r.statusText, headers: Array.from(r.headers.entries()), body };
  } catch (e) {
    return { ...base, error: e instanceof Error ? e.message : "Eroare de rețea" };
  } finally {
    controllere.delete(m.id);
  }
}

export function anuleazaFetch(id: number) {
  controllere.get(id)?.abort();
  controllere.delete(id);
}

export function persistaStocare(m: { t: string; k?: string; v?: string }, storage: Storage) {
  try {
    if (m.t === "ls-set" && scriereAcceptata(m.k ?? "") && typeof m.v === "string") storage.setItem(m.k!, m.v);
    else if (m.t === "ls-del" && scriereAcceptata(m.k ?? "")) storage.removeItem(m.k!);
    // ls-clear: șterge doar cheile care ar fi intrat în snapshot (nu sesiunea)
    else if (m.t === "ls-clear") {
      for (const k of Object.keys(citesteSnapshot(storage))) storage.removeItem(k);
    }
  } catch {
    /* cota depășită sau stocare blocată */
  }
}
