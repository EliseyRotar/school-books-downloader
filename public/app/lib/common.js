// Folio — shared browser toolkit.
// All downloading happens here in the page. Credentials stay in this tab
// (optionally sealed into your plaintext Cabinet stored on your device).

window.Folio = window.Folio || {};
const F = Folio;

// The Cloudflare Pages relay lives on the same origin at /api/proxy.
// When previewing the static site without the relay, engines that need
// it report a clear, actionable error instead of failing silently.
F.PROXY_HOST = "/api/proxy";

F.bytesToB64 = (bytes) => {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
};

F.b64ToBytes = (b64) => {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

function initFromOpts(opts) {
  const init = { method: opts.method || "GET", headers: opts.headers || {}, redirect: "follow" };
  if ("body" in opts) init.body = opts.body;
  return init;
}

// Fetch a book-platform resource. `viaProxy: true` routes it through the
// relay so CORS-locked backends are reachable from the browser page.
F.api = async function api(url, opts = {}, { viaProxy } = {}) {
  if (!viaProxy) return fetch(url, initFromOpts(opts));
  return relay(url, opts);
};

async function relay(url, opts) {
  let res;
  try {
    res = await fetch(F.PROXY_HOST, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        method: opts.method || "GET",
        headers: opts.headers || {},
        bodyBase64: opts.body ? F.bytesToB64(opts.body) : undefined
      })
    });
  } catch (_) {
    throw new Error("The Folio relay is unreachable. Deploy on Cloudflare Pages for full coverage.");
  }
  if (!res.ok) throw new Error("relay HTTP " + res.status);
  const j = await res.json();
  if (!j.ok) throw new Error(j.error || "relay error " + j.status);
  const ct = (j.headers && (j.headers["content-type"] || j.headers["Content-Type"])) || "application/octet-stream";
  const bytes = j.dataBase64 ? F.b64ToBytes(j.dataBase64) : new Uint8Array(0);
  return new Response(bytes, { status: j.status || 200, headers: { "content-type": ct, "x-folio-proxied": "1" } });
}

// Detect whether the relay is deployed on this origin (one cheap call).
F.relayAvailable = async function relayAvailable() {
  try {
    const r = await fetch(F.PROXY_HOST + "?url=https://example.com", { method: "GET" });
    const j = await r.json();
    // host-not-allowed is proof the relay is alive; "not found" means a
    // static host without Functions.
    return j && (j.ok === false || typeof j.ok === "boolean");
  } catch (_) {
    return false;
  }
};

let _logEl = null;
F.bindLog = (el) => { _logEl = el; if (el) el.scrollTop = el.scrollHeight; };
F.log = (txt, cls) => {
  if (!_logEl) return;
  const span = document.createElement("span");
  if (cls) span.className = cls;
  span.textContent = txt + "\n";
  _logEl.appendChild(span);
  _logEl.scrollTop = _logEl.scrollHeight;
};
F.ok = (t) => F.log(t, "ok");
F.err = (t) => F.log(t, "err");
F.dim = (t) => F.log(t, "dim");

F.saveBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
};

F.sanitizeName = (s) => (s || "book").replace(/[\\/:*?"<>|]+/g, "_").trim() || "book";

F.fmtBytes = (n) => {
  if (!Number.isFinite(n)) return "?";
  if (n < 1024) return n + " B";
  const u = ["KB", "MB", "GB"];
  let i = -1;
  do { n /= 1024; i++; } while (n >= 1024 && i < u.length - 1);
  return n.toFixed(1) + " " + u[i];
};

F.loadScript = (src) => new Promise((resolve, reject) => {
  const s = document.createElement("script");
  s.src = src;
  s.onload = () => resolve();
  s.onerror = () => reject(new Error("Failed to load " + src));
  document.head.appendChild(s);
});

// Load the heavy CDN libraries once, on demand.
F.libs = { sql: null, jszip: false, pdflib: false };
F.ensure = async function ensure({ sql, jszip, pdflib }) {
  const jobs = [];
  if (sql && !F.libs.sql) {
    jobs.push(F.loadScript("https://cdn.jsdelivr.net/npm/sql.js@1.11.0/dist/sql-wasm.js")
      .then(async () => {
        F.libs.sql = await initSqlJs({ locateFile: (f) => "https://cdn.jsdelivr.net/npm/sql.js@1.11.0/dist/" + f });
      }));
    await Promise.all(jobs.splice(0, jobs.length));
  }
  if (jszip && !F.libs.jszip) {
    jobs.push(F.loadScript("https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js").then(() => { F.libs.jszip = true; }));
  }
  if (pdflib && !F.libs.pdflib) {
    jobs.push(F.loadScript("https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js").then(() => { F.libs.pdflib = true; }));
  }
  await Promise.all(jobs);
};

F.esc = (s) => String(s === null || s === undefined ? "" : s).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));