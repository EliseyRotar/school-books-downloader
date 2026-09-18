// Folio engine — DiBooK (Laterza).
// Auth: JWT from Local Storage. Page PDFs are individually protected by
// a per-ISBN password. Where the old CLI shelled out to pdftk, Folio
// unlocks each page inside the browser with pdf-lib and merges to one PDF.
// DiBooK's API does not send CORS headers, so all calls go through the
// Folio relay (/api/proxy).

Folio.engines = Folio.engines || {};

Folio.engines.dibook = {
  id: "dibook",
  meta: {
    label: "DiBooK",
    publisher: "Laterza",
    country: "IT",
    status: "needs-testing",
    connectable: true,
    needsRelay: true,
    desc: "Login is a JWT; add each book by ISBN. Every page is unlocked in-browser and merged to a single PDF."
  },
  creds: [
    { k: "token", type: "password", label: "JWT", hint: "Application → Local Storage → dibooklaterza.it → jwtToken" }
  ],

  base: "https://api.dibooklaterza.it/api/reader",

  pagePassword(isbn) {
    return "AB8374JJ" + String(isbn).padEnd(16, "0") + "H48js83A";
  },

  async fetchIndex(isbn, tok, ctx) {
    ctx.log("→ GET /api/reader/" + isbn + "/index");
    const res = await Folio.api(this.base + "/" + encodeURIComponent(isbn) + "/index", {
      headers: { Authorization: "Bearer " + tok }
    }, { viaProxy: true });
    if (res.status === 401 || res.status === 403) throw new Error("JWT rejected — is it fresh?");
    if (!res.ok) throw new Error("index HTTP " + res.status);
    return await res.json();
  },

  async connect(secrets) {
    const tok = (secrets.token || "").trim();
    if (!tok) throw new Error("Paste your JWT first.");
    // No library endpoint exists on DiBooK — the ISBN is the shelf.
    // We validate the token liveness with a probe on first ISBN entry.
    return {
      account: { auth: "token", label: "token " + tok.slice(0, 8) + "…", sub: "dibook · add by ISBN" },
      secrets: { token: tok },
      books: []
    };
  },

  async probe(tok, isbn, ctx) {
    await this.fetchIndex(isbn, tok, ctx);
    return true;
  },

  async addBook(s, isbn, ctx) {
    const idx = await this.fetchIndex(isbn, s.token, ctx);
    ctx.ok("Index found — “" + idx.name + "” (" + (idx.chapters || []).length + " chapter(s))");
    return {
      id: String(isbn),
      title: idx.name || "Book " + isbn,
      isbn: String(isbn),
      cover: "",
      count: (idx.chapters || []).reduce((n, c) => n + (c.pageLabels || []).length, 0)
    };
  },

  async download(book, s, ctx, onProgress) {
    await Folio.ensure({ pdflib: true });
    const isbn = book.isbn || book.id;
    const password = this.pagePassword(isbn);
    const idx = await this.fetchIndex(isbn, s.token, ctx);

    const pages = [];
    for (const ch of idx.chapters || []) {
      for (const label of ch.pageLabels || []) {
        pages.push({ ch: ch.id, label, password });
      }
    }
    ctx.ok("Pages to fetch: " + pages.length);

    const parts = [];
    for (let i = 0; i < pages.length; i++) {
      const p = pages[i];
      ctx.dim("page " + (i + 1) + "/" + pages.length + "  (" + p.ch + "/" + p.label + ")");
      const urlTxtRes = await Folio.api(
        this.base + "/" + encodeURIComponent(isbn) + "/" + encodeURIComponent(p.ch) + "/pdf-secure/" + encodeURIComponent(p.label),
        { headers: { Authorization: "Bearer " + s.token } },
        { viaProxy: true });
      const pdfUrl = (await urlTxtRes.text()).trim();
      parts.push({
        url: pdfUrl,
        viaProxy: !/^https:\/\/([a-z0-9-]+\.)*dibooklaterza\.it/.test(pdfUrl) ? false : true,
        password,
        label: p.label
      });
      if (onProgress) onProgress(i + 1, pages.length);
    }

    ctx.log("Merging " + parts.length + " page PDF(s)…");
    const { bytes, pages: pageCount } = await Folio.pdf.merge(parts, { chunk: 60, onProgress });
    ctx.ok("Assembly complete — " + pageCount + " page(s), " + Folio.fmtBytes(bytes.byteLength));
    return { filename: Folio.sanitizeName(book.title) + ".pdf", bytes };
  }
};