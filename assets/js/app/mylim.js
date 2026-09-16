// MyLim (Loescher) in-browser downloader.
let books = [];
let busy = false;

function token() { return document.getElementById("token").value.trim(); }

async function grabTitles() {
  if (busy) return;
  const t = token();
  if (!t) { err("Paste your JWT first (Application → Local Storage → token)."); return; }

  busy = true;
  spin(true, "Listing…");
  log("→ GET /mialim2/api/v1/book/sommari/");
  try {
    books = await jjson("https://loeda.loescher.it/mialim2/api/v1/book/sommari/", {
      headers: { Authorization: "JWT " + t }
    });
    ok(`Shelf loaded — ${books.length} entrie(s).`);
    renderBooks();
  } catch (e) {
    err("Couldn’t list books: " + e.message);
    if (/401|403/.test(e.message)) dim("The token may be wrong or expired — grab a fresh one.");
  }
  busy = false;
  spin(false);
}

function renderBooks() {
  const list = document.getElementById("booklist");
  list.innerHTML = "";
  for (const book of books) {
    const o = book.opera || {};
    const el = document.createElement("div");
    el.className = "bookrow";
    el.setAttribute("data-isbn", o.isbn || "");
    el.setAttribute("data-type", book.tipologia || "");
    el.innerHTML =
      `<img src="${o.copertina || ""}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">` +
      `<div class="meta">` +
      `<h4>${esc(o.nome || "Untitled")}</h4>` +
      `<div class="isbn">${esc(o.isbn || "")} · ${esc(o.autore || "")}</div>` +
      `</div>`;
    el.addEventListener("click", () => download(o.isbn, o.nome));
    list.appendChild(el);
  }
  updateList();
}

function updateList() {
  const q = (document.getElementById("search").value || "").toUpperCase();
  const hideDemos = document.getElementById("demos").checked;
  document.querySelectorAll("#booklist .bookrow").forEach((el) => {
    const hay = (el.querySelector(".meta").innerText || "").toUpperCase();
    const isDemo = el.getAttribute("data-type") === "d";
    let show = hay.includes(q);
    if (show && hideDemos && isDemo) show = false;
    el.style.display = show ? "flex" : "none";
  });
}

async function download(isbn, title) {
  if (busy || !isbn) return;
  busy = true;
  spin(true, "Downloading…");
  dim(`→ ${title} (${isbn})`);
  try {
    const t = token();
    const info = await jjson(`https://loeda.loescher.it/mialim2/api/v1/book/pdf/${isbn}/`, {
      headers: { Authorization: "JWT " + t }
    });
    if (!info.url) throw new Error("no PDF url returned");
    log("→ fetching " + info.url);
    const res = await jfetch(info.url, { headers: { Authorization: "JWT " + t } });
    const blob = await res.blob();
    saveBlob(blob, sanitizeName(title) + ".pdf");
    ok(`Saved  ${sanitizeName(title)}.pdf  (${fmtBytes(blob.size)})`);
  } catch (e) {
    err("Download failed: " + e.message);
  }
  busy = false;
  spin(false);
}

function esc(s) {
  return String(s || "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

bindLog(document.getElementById("log"));