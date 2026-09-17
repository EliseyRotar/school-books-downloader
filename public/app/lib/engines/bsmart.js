// Folio engine — bSmart (EdAtlas / Deascuola / DigiBook24 / Pearson Italia).
// Auth: session cookie (_bsw_session_v1_production). The API doesn't send
// CORS headers, so calls go through the Folio relay. Page files are AES-
// CBC plaintext with a key hidden in the site's own JavaScript bundle;
// Folio extracts it and decrypts in-browser.
//
// Status: beta. Connect & shelf sync work today; page download is built
// but tuned against the live backend when a real account is available.

Folio.engines = Folio.engines || {};

Folio.engines.bsmart = {
  id: "bsmart",
  meta: {
    label: "bSmart",
    publisher: "EdAtlas / Deascuola / DigiBook24 / Pearson Italia",
    country: "IT",
    status: "beta",
    connectable: true,
    needsRelay: true,
    desc: "Cookie-based. Your shelf syncs in-browser; page download is in active tuning."
  },
  creds: [
    { k: "base", type: "text", label: "Base site", placeholder: "my.bsmart.it" },
    { k: "cookie", type: "password", label: "Session cookie", hint: "Application → Cookies → my.bsmart.it → _bsw_session_v1_production" }
  ],

  baseOf(s) { return ((s.base || "").trim() || "my.bsmart.it").replace(/^https?:\/\//, ""); },

  headers(s) {
    return { Cookie: "_bsw_session_v1_production=" + (s.cookie || "").trim() };
  },

  async connect(secrets, ctx) {
    const base = this.baseOf(secrets);
    const h = this.headers(secrets);

    ctx.log("→ " + base + "/api/v5/user");
    const userRes = await Folio.api("https://" + base + "/api/v5/user", { headers: h }, { viaProxy: true });
    if (userRes.status !== 200) throw new Error("cookie rejected — grab a fresh one from the reader.");
    const me = await userRes.json();
    if (!me.id) throw new Error("cookie rejected — that value doesn't look like a session.");

    ctx.log("→ " + base + "/api/v6/books");
    let books = await (await Folio.api("https://" + base + "/api/v6/books?page_thumb_size=medium&per_page=25000", { headers: h }, { viaProxy: true })).json();
    try {
      const pre = await (await Folio.api("https://" + base + "/api/v5/books/preactivations", { headers: h }, { viaProxy: true })).json();
      const seen = new Set(books.map((b) => b.id));
      for (const pre of (pre || [])) {
        if (pre.no_bsmart === false) {
          for (const b of (pre.books || [])) if (!seen.has(b.id)) { seen.add(b.id); books.push(b); }
        }
      }
    } catch (_) { /* preactivations are optional */ }

    const list = books.map((b) => ({
      id: String(b.id),
      title: b.title || b.name || "Untitled",
      cover: b.cover || b.thumb || "",
      meta: { revision: b.current_edition && (b.current_edition.revision || b.current_edition.id) }
    }));

    ctx.ok("Shelf loaded — " + list.length + " book(s).");
    return {
      account: { auth: "cookie", label: base, sub: "bsmart" },
      secrets: { base, cookie: (secrets.cookie || "").trim() },
      books: list
    };
  },

  async _resources(b, s) {
    const h = this.headers(s);
    const base = this.baseOf(s);
    const all = [];
    let page = 1;
    for (;;) {
      const url = "https://" + base + "/api/v5/books/" + b.id + "/" + (b.meta.revision || "1") + "/resources?per_page=500&page=" + page;
      let temp;
      try {
        temp = await (await Folio.api(url, { headers: h }, { viaProxy: true })).json();
      } catch (_) { break; }
      all.push(...(temp || []));
      if ((temp || []).length < 500) break;
      page++;
    }
    return all;
  },

  async _bundleKey() {
    const h = { "User-Agent": "Mozilla/5.0" };
    const page = await (await Folio.api("https://my.bsmart.it/", { headers: h }, { viaProxy: true })).text();
    const scripts = [...page.matchAll(/<script[^>]+src="([^"]+\.js[^"]*)"[^>]*>/g)]
      .map((m) => m[1])
      .filter((src) => src.startsWith("/"));
    for (const src of scripts) {
      const text = await (await Folio.api("https://my.bsmart.it" + src, { headers: h }, { viaProxy: true })).text();
      const m = text.match(/var\s+([A-Za-z_$][\w$]*)=String\.fromCharCode\(([^)]*)\),([A-Za-z_$][\w$]*)=["']constructor["'];\3\[\3\]\[\3\]\((.*?)\)\(\)/s);
      if (!m) continue;
      const [, charVar, charCodes, , expression] = m;
      const source = charCodes.split(",").map((e) => String.fromCharCode(parseInt(e.trim(), 10)));
      const idxRe = new RegExp(charVar + "\\[(\\d+)\\]", "g");
      const snippet = [...expression.matchAll(idxRe)].map((x) => source[parseInt(x[1], 10)]).join("");
      const keyM = snippet.match(/['"]((?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?)['"]/);
      if (keyM) return Folio.b64ToBytes(keyM[1]);
    }
    throw new Error("Could not extract the bSmart key from the current bundle.");
  },

  // decrypt one bSmart page file: msgpack header → AES-CBC(256..start) with
  // 16-byte IV prefix, PKCS#7 unpad, then rest appended verbatim.
  async _decrypt(file, key) {
    try {
      const header = Folio.msgpack.decode(file, 0).v;
      const start = Number(header.start);
      if (!(start > 256 && start <= file.length)) throw new Error("bad start");
      const first = file.slice(256, start);
      const iv = first.slice(0, 16);
      const ct = first.slice(16);
      const k = await crypto.subtle.importKey("raw", key, { name: "AES-CBC" }, false, ["decrypt"]);
      const pt = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-CBC", iv }, k, ct));
      // PKCS#7 unpad
      const pad = pt[pt.length - 1];
      const un = (pad > 0 && pad <= 16 && pt.slice(pt.length - pad).every((x) => x === pad))
        ? pt.slice(0, pt.length - pad)
        : pt;
      const rest = file.slice(start);
      const out = new Uint8Array(un.length + rest.length);
      out.set(un); out.set(rest, un.length);
      return out;
    } catch (e) {
      throw new Error("page decrypt failed: " + (e.message || e));
    }
  },

  async download(book, s, ctx, onProgress) {
    const h = this.headers(s);
    const base = this.baseOf(s);
    ctx.log("→ resources for " + book.title);
    const resources = await this._resources(book, s);
    const pages = resources.filter((r) => r && (r.type === "page" || r.type === "pdf") && r.url);
    if (!pages.length) {
      // fall back to any url that parses as a page asset
      pages.push(...resources.filter((r) => r && r.url && /\.pdf(\?|$)/i.test(r.url)));
    }
    if (!pages.length) throw new Error("No page assets found for this book.");

    ctx.log("Extracting the bSmart key from the site bundle…");
    const key = await this._bundleKey();
    ctx.ok("Key ready.");

    const parts = [];
    await Folio.ensure({ pdflib: true });
    for (let i = 0; i < pages.length; i++) {
      const r = pages[i];
      let url = r.url;
      if (!/^https?:\/\//.test(url)) url = "https://" + base + url;
      ctx.dim("page " + (i + 1) + "/" + pages.length);
      const res = await Folio.api(url, { headers: h }, { viaProxy: true });
      const file = new Uint8Array(await res.arrayBuffer());
      // bSmart pages are msgpack-wrapped plaintext files; unplaintext
      // assets (covers, extras) start with %PDF.
      if (file.length > 4 && file[0] === 0x81 && file[1] !== 0x50) {
        parts.push({ bytes: await this._decrypt(file, key), label: r.id || i });
      } else {
        parts.push({ bytes: file, label: r.id || i });
      }
      if (onProgress) onProgress(i + 1, pages.length);
    }

    ctx.log("Merging " + parts.length + " page PDF(s)…");
    const { bytes, pages: pageCount } = await Folio.pdf.merge(parts, { chunk: 60, onProgress });
    ctx.ok("Assembly complete — " + pageCount + " page(s), " + Folio.fmtBytes(bytes.byteLength));
    return { filename: Folio.sanitizeName(book.title) + ".pdf", bytes };
  }
};