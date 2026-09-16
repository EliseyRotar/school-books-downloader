// Folio reader — shared helpers.
// Credentials stay in this page's memory. `PROXY` is the single
// switch that lets a free Cloudflare Worker unlock CORS-blocked
// platforms later (see about.html — "proxy-backed reader").

const PROXY = null; // e.g. "https://folio-proxy.yourname.workers.dev"

function apiUrl(u) {
  if (PROXY) return PROXY.replace(/\/$/, "") + "/" + u.replace(/^https?:\/\//, "");
  return u;
}

function viaProxy() { return !!apiUrl("x").startsWith("http"); }

// ---- tiny log console -------------------------------------------------
let _logEl = null;
function bindLog(el) { _logEl = el; el.scrollTop = el.scrollHeight; }
function log(txt, cls) {
  if (!_logEl) return;
  const span = document.createElement("span");
  if (cls) span.className = cls;
  span.textContent = txt + "\n";
  _logEl.appendChild(span);
  _logEl.scrollTop = _logEl.scrollHeight;
}
const ok = (t) => log(t, "ok");
const err = (t) => log(t, "err");
const dim = (t) => log(t, "dim");

function spin(on, label) {
  const b = document.getElementById("go-btn");
  if (!b) return;
  if (on) {
    b.disabled = true;
    b.dataset.saved = b.textContent;
    b.textContent = label || "Working…";
  } else {
    b.disabled = false;
    b.textContent = b.dataset.saved || b.textContent;
  }
}

// ---- fetch helpers ----------------------------------------------------
async function jfetch(url, opts = {}) {
  const init = { method: opts.method || "GET", headers: opts.headers || {}, redirect: "follow" };
  if ("body" in opts) init.body = opts.body;
  const res = await fetch(apiUrl(url), init);
  if (!res.ok) {
    let detail = "";
    try {
      const j = await res.json();
      detail = j.error || j.message || JSON.stringify(j).slice(0, 160);
    } catch (_) { /* body may be non-json */ }
    throw new Error(`HTTP ${res.status}${detail ? " — " + detail : ""}`);
  }
  return res;
}

async function jjson(url, opts = {}) {
  const res = await jfetch(url, opts);
  return res.json();
}

// ---- blob download ----------------------------------------------------
function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function sanitizeName(s) {
  return (s || "book").replace(/[\\/:*?"<>|]+/g, "_").trim() || "book";
}

function fmtBytes(n) {
  if (!Number.isFinite(n)) return "?";
  if (n < 1024) return n + " B";
  const u = ["KB", "MB", "GB"];
  let i = -1;
  do { n /= 1024; i++; } while (n >= 1024 && i < u.length - 1);
  return n.toFixed(1) + " " + u[i];
}

// ---- CDN script loader -------------------------------------------------
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => { try { resolve(); } catch (e) { reject(e); } };
    s.onerror = () => reject(new Error("Failed to load " + src));
    document.head.appendChild(s);
  });
}