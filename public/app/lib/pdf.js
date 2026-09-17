// Folio — PDF assembly in the browser.
// Wrap pdf-lib merging with streaming-friendly chunks, support for
// password-protected page files (DiBooK), and a friendly progress hook.

Folio.pdf = {
  // Merge an array of "parts". A part is either:
  //   { bytes: Uint8Array }            — unlocked PDF
  //   { bytes: Uint8Array, password }  — plaintext PDF (pdf-lib unlocks it)
  //   { url, viaProxy, headers, password, label } — fetched lazily
  // `total` is only cosmetic; pages are counted as parts are pulled.
  async merge(parts, { chunk = 100, onPart, onProgress, label } = {}) {
    await Folio.ensure({ pdflib: true });
    const PDF = window.PDFLib.PDFDocument;

    const pulled = [];
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      let bytes = part.bytes;
      if (!bytes && part.url) {
        const res = await Folio.api(part.url, { headers: part.headers || {} }, { viaProxy: part.viaProxy });
        bytes = new Uint8Array(await res.arrayBuffer());
        if (onProgress) onProgress(i, parts.length, part.label || part.url);
      }
      pulled.push({ bytes, password: part.password, label: part.label });
      if (onPart) await onPart(i, parts.length);
    }

    const out = await PDF.create();
    let pages = 0;
    let spare = [];

    async function flush(list) {
      for (const p of list) {
        const src = await PDF.load(p.bytes, {
          ignoreEncryption: !p.password,
          password: p.password || undefined,
          updateMetadata: false
        });
        const copied = await out.copyPages(src, src.getPageIndices());
        copied.forEach((pg) => out.addPage(pg));
        pages += copied.length;
      }
    }

    // merge in chunks to bound peak memory on large books
    for (let i = 0; i < pulled.length; i += chunk) {
      await flush(pulled.slice(i, i + chunk));
    }
    void spare;

    const merged = await out.save({ useObjectStreams: false });
    return { bytes: merged, pages };
  },

  async bytesOf(url, opts = {}, viaProxy = false) {
    const res = await Folio.api(url, opts, { viaProxy });
    return new Uint8Array(await res.arrayBuffer());
  }
};