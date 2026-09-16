// HUB Scuola / Young / Kids — in-browser downloader.
// Auth: email+password (Mondadori JSONP → internalLogin) OR pasted token.
// Download: publication.zip → SQLite index → per-chapter zips → merge.

let mode = "mail";
let tok = "";
let books = [];
let busy = false;
let SQL = null;

function es(v) { return v !== null && v !== undefined ? v : ""; }

function esc(s) {
  return String(es(s)).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function setMode(m) {
  mode = m;
  document.getElementById("seg-mail").classList.toggle("on", m === "mail");
  document.getElementById("seg-token").classList.toggle("on", m === "token");
  document.getElementById("mail-fields").style.display = m === "mail" ? "" : "none";
  document.getElementById("token-field").style.display = m === "token" ? "" : "none";
}

async function connect() {
  if (busy) return;
  const platform = document.getElementById("platform").value;

  busy = true;
  spin(true, "Connecting…");

  try {
    if (mode === "mail") {
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
      if (!email || !password) { err("Enter both email and password."); busy = false; spin(false); return; }
      tok = await mailLogin(email, password);
      ok("Authenticated. tokenId: " + tok.slice(0, 12) + "…");
    } else {
      tok = document.getElementById("token").value.trim();
      if (!tok) { err("Paste your session token."); busy = false; spin(false); return; }
      ok("Using pasted session token.");
    }

    log("→ GET /getLibrary/" + platform);
    const lib = await jjson("https://ms-api.hubscuola.it/getLibrary/" + platform, {
      headers: { "Token-Session": tok, "Content-Type": "application/json" }
    });
    books = extractBooks(lib);
    ok(`Library loaded — ${books.length} book(s).`);
    renderBooks(platform);
  } catch (e) {
    err("Connection failed: " + e.message);
  }

  busy = false;
  spin(false);
}

async function mailLogin(email, password) {
  log("→ GET bce.mondadorieducation.it/loginJsonp");
  const u = "https://bce.mondadorieducation.it/app/mondadorieducation/login/loginJsonp?username=" +
    encodeURIComponent(email) + "&password=" + encodeURIComponent(password);
  const res = await jfetch(u, { headers: { Accept: "application/json" } });
  const body = await res.json();
  if (body.result && body.result !== "OK") {
    throw new Error((body.error || "login rejected") + (body.data && body.data.length ? " — " + body.data : ""));
  }
  const d = body.data || {};
  log("→ POST ms-api.hubscuola.it/user/internalLogin");
  const r2 = await jjson("https://ms-api.hubscuola.it/user/internalLogin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: d.username,
      sessionId: d.sessionId,
      jwt: d.hubEncryptedUser
    })
  });
  if (!r2.tokenId) throw new Error("internalLogin did not return a tokenId");
  return r2.tokenId;
}

// The library JSON shape has changed across versions; be tolerant.
function extractBooks(lib) {
  const out = [];
  // Accept either a bare array or an object whose first array-valued key
  // holds the book list.
  let arr = lib;
  while (arr && typeof arr === "object" && !Array.isArray(arr)) {
    const keys = Object.keys(arr).filter((k) => Array.isArray(arr[k]));
    if (keys.length === 0) break;
    arr = arr[keys[0]];
  }
  for (const it of Array.isArray(arr) ? arr : []) {
    const rec = it.volume || it;
    const id = rec.volumeId || rec.id || rec.vid || it.volumeId || it.id || null;
    const title = it.title || rec.title || rec.coverTitle || null;
    const cover = it.thumbnail || it.cover || rec.thumbnail || rec.cover || rec.coverImage || null;
    if (id) out.push({ id: String(id), title: title || "Untitled", cover });
  }
  return out;
}

function renderBooks(platform) {
  const wrap = document.getElementById("shelfwrap");
  wrap.style.display = "";
  document.getElementById("shelf-title").textContent = "Your books · " + platform.toUpperCase();
  const list = document.getElementById("booklist");
  list.innerHTML = "";

  if (!books.length) {
    list.innerHTML = `<div class="notice"><b>Empty shelf.</b> No volumes found for ${platform.toUpperCase()} under this account. Try another platform from the menu.</div>`;
    return;
  }

  for (const b of books) {
    const el = document.createElement("div");
    el.className = "bookrow";
    el.innerHTML =
      `<img src="${esc(b.cover)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">` +
      `<div class="meta"><h4>${esc(b.title)}</h4><div class="isbn">volume ${esc(b.id)}</div>` +
      `<div class="post">click to download · merges chapters in-browser</div></div>`;
    el.addEventListener("click", () => downloadBook(b, platform));
    list.appendChild(el);
  }
}

async function downloadBook(b, platform) {
  if (busy) return;
  busy = true;
  spin(true, "Preparing…");
  dim("Volume " + b.id + " — " + b.title);

  const headers = { "Token-Session": tok, "Content-Type": "application/json" };

  try {
    log("→ GET me" + platform + "/publication/" + b.id);
    let title = b.title;
    try {
      const pub = await jjson("https://ms-api.hubscuola.it/me" + platform + "/publication/" + b.id, { headers });
      if (pub && pub.title) title = pub.title;
    } catch (_) { /* optional — fall back to library title */ }
    ok("Title: " + title);

    await ensureSqlJs();

    log("→ GET downloadPackage/" + b.id + "/publication.zip");
    const pubZip = await jfetch(
      "https://ms-mms.hubscuola.it/downloadPackage/" + b.id + "/publication.zip?tokenId=" + encodeURIComponent(tok),
      { headers });
    const pubBuf = await pubZip.arrayBuffer();
    dim(`publication.zip — ${fmtBytes(pubBuf.byteLength)}`);

    const zip = await JSZip.loadAsync(pubBuf);
    const dbFile = findDb(zip);
    if (!dbFile) throw new Error("publication.db not found inside the package");
    dim("reading " + dbFile);
    const dbBytes = await zip.file(dbFile).async("uint8array");

    const db = new SQL.Database(dbBytes);
    const stmt = db.prepare("SELECT offline_value FROM offline_tbl WHERE offline_path=?");
    stmt.bind(["me" + platform + "/publication/" + b.id]);
    let row = null;
    while (stmt.step()) row = stmt.get();
    stmt.free();
    db.close();
    if (!row) throw new Error("no chapter index for this volume (check platform: young/kids?)");
    const index = JSON.parse(row[0]);
    const chapters = (index.indexContents && index.indexContents.chapters) || [];
    if (!chapters.length) throw new Error("chapter list is empty");
    ok("Chapters: " + chapters.length);

    const out = await PDFLib.PDFDocument.create();
    let pages = 0;
    for (let ci = 0; ci < chapters.length; ci++) {
      const ch = chapters[ci];
      const chId = ch.chapterId;
      log(`→ chapter ${ci + 1}/${chapters.length}  (${chId})`);
      const chUrl = "https://ms-mms.hubscuola.it/public/" + b.id + "/" + encodeURIComponent(chId) + ".zip?tokenId=" +
        encodeURIComponent(tok) + "&app=v2";
      const chRes = await jfetch(chUrl, { headers });
      const chBuf = await chRes.arrayBuffer();
      const chZip = await JSZip.loadAsync(chBuf);
      const pdfs = Object.keys(chZip.files)
        .filter((n) => n.toLowerCase().endsWith(".pdf") && !chZip.files[n].dir)
        .sort();
      dim(`  ${pdfs.length} page PDF(s) — ${fmtBytes(chBuf.byteLength)}`);
      for (const name of pdfs) {
        const pdfBytes = await chZip.file(name).async("uint8array");
        const src = await PDFLib.PDFDocument.load(pdfBytes, { ignoreEncryption: true });
        const copied = await out.copyPages(src, src.getPageIndices());
        copied.forEach((p) => out.addPage(p));
        pages += copied.length;
      }
    }

    log("Merging and saving…");
    const merged = await out.save({ useObjectStreams: false });
    const name = sanitizeName(title) + ".pdf";
    saveBlob(new Blob([merged], { type: "application/pdf" }), name);
    ok(`Saved ${name} — ${pages} page(s), ${fmtBytes(merged.byteLength)}`);
  } catch (e) {
    err("Download failed: " + e.message);
    if (/CORS|Failed to fetch|NetworkError|load failed/i.test(e.message)) {
      dim("A CORS error here means your library/licence may block this volume from the web reader — try the CLI tool for this platform instead (see the CLI desk).");
    }
  }
  busy = false;
  spin(false);
}

function findDb(zip) {
  const names = Object.keys(zip.files);
  return names.find((n) => n.toLowerCase().endsWith("publication.db")) ||
    names.find((n) => n.toLowerCase().endsWith(".db"));
}

async function ensureSqlJs() {
  if (SQL) return;
  log("loading sql.js (SQLite for the browser)…");
  SQL = await initSqlJs({
    locateFile: (f) => "https://cdn.jsdelivr.net/npm/sql.js@1.11.0/dist/" + f
  });
  ok("sql.js ready.");
}

bindLog(document.getElementById("log"));