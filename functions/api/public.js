// Folio — Pages Function: the public catalog API.
//
// Reads every device's cabinet doc and returns ONLY book metadata:
// title, author, ISBN, platform, cover. Never returns secrets,
// credentials, account rows, or device ids. This is what catalog.html
// consumes — the full doc stays behind /api/cabinet.

export async function onRequestGet(context) {
  const db = context.env.DB;
  if (!db) return json({ ok: false, error: "D1 not bound — Cabinet unavailable" }, 500);

  const rows = await db.prepare("SELECT doc FROM cabinet").all();
  const books = [];

  for (const row of rows.results || []) {
    let doc;
    try {
      doc = JSON.parse(row.doc);
    } catch (_) {
      continue;
    }
    for (const b of doc.books || []) {
      books.push({
        title: b.title || "",
        author: (b.meta && b.meta.author) || "",
        isbn: b.isbn || "",
        platform: b.platform || "",
        cover: b.cover || ""
      });
    }
  }

  return json({ ok: true, count: books.length, books });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=utf-8" } });
}
