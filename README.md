# Folio

Download the schoolbooks you already own as plain PDFs — in the browser.
Connect your textbook platforms (HUB Scuola, MyLim, DiBooK, bSmart and
more), keep every account, token and book in one **plaintext Cabinet on your
own device**, and rebuild any volume into a single PDF on the spot.

No app to install. No account with us. Nothing you type is uploaded —
the only network traffic goes to the platform you're already logged into.

## What you get

| Platform | Auth | Status |
| --- | --- | --- |
| HUB Scuola / Young / Kids — Mondadori | email+password **or** token | ready · in-browser |
| MyLim — Loescher | JWT | ready · in-browser |
| DiBooK — Laterza | JWT (+ ISBN) | ready · in-browser |
| bSmart — EdAtlas / Deascuola / DigiBook24 | session cookie | beta · shelf syncs, download tuning |
| Zanichelli, Pearson, Sanoma, Educadhoc, WSET, Hoepli, Scuolabook, MEE2, Oxford, digi4school, German shelves, NCERT, McGraw-Hill, RedShelf | — | on the docket |

Every platform is built from the same four in-browser steps — *fetch the
pages, unlock, render, merge* — so the docket shrinks one backend at a
time, in the same reader.

## How the Cabinet works

- You pick one **passphrase**. It never leaves the tab.
- The browser derives a key (PBKDF2-SHA256 → AES-GCM) and seals your
  accounts, tokens, credentials and book list into a single blob.
- The blob lives in your browser's storage and can be backed up to a
  Cloudflare D1 database. Without your passphrase that blob is
  unreadable — by us or anyone.
- Forget the passphrase and the Cabinet stays closed. That's the point.
  There is no back door.

## How the relay works

Browsers can only call APIs that send CORS headers. Many textbook
backends don't. The repo ships a small Cloudflare Pages Function
(`functions/api/proxy.js`) that pipes requests byte-for-byte to a
curated allowlist of schoolbook hosts. It logs nothing, stores nothing,
and rejects anything outside the list.

## Repository layout

```
public/                 static site (Pages root)
  app/                  the Reader (Cabinet + shelf UI)
    lib/
      common.js         fetch/download helpers + the relay client
      Cabinet.js          plaintext Cabinet + D1 sync
      msgpack.js        minimal msgpack reader (used by bSmart pages)
      pdf.js            in-browser PDF assembly
      engines/          one file per platform downloader
  assets/               css + catalog data
  _headers  _redirects  robots.txt  sitemap.xml  404.html
functions/              Cloudflare Pages Functions
  api/proxy.js          textbook relay (allowlist only)
  api/Cabinet.js          plaintext Cabinet sync (D1)
wrangler.toml           Pages + D1 config
schema.sql              the single D1 table
```

The whole static side is dependency-free, build-free HTML/CSS/JS.
The only CDNs pulled at runtime are sql.js, JSZip and pdf-lib.

## Run it locally

Static-only preview (Reader works; relay-dependent engines report the
relay is missing):

```sh
python3 -m http.server 8000
# → http://localhost:8000
```

Full preview with Functions + local D1 (mirrors production):

```sh
npm i -g wrangler
npx wrangler pages dev public
# → http://localhost:8788
```

## Deploy (free, ~5 minutes)

1. **Create the D1 database**

   ```sh
   npx wrangler d1 create folio
   # copy the database_id it prints
   ```

   Paste it into `wrangler.toml` under `d1_databases → database_id`.

2. **Create the schema**

   ```sh
   npx wrangler d1 execute folio --file=schema.sql
   ```

3. **Deploy the site + functions**

   ```sh
   npx wrangler login
   npx wrangler pages deploy public
   # prints → https://<name>.pages.dev
   ```

4. **Wire the D1 binding** (deploys don't read `database_id` the same way
   Workers do — bind once in the dashboard):

   Dashboard → your Pages project → **Settings → Functions →
   D1 database bindings** → bind variable name `DB` to the `folio`
   database, then re-deploy. Or set it via
   `wrangler pages secret`/config if you prefer wrangler-managed config.

That's it. The Reader auto-detects the relay on load.

If you point a custom domain at the Pages project, update
`sitemap.xml` (and optionally `robots.txt`, `/_redirects`) to match.

## Adding a platform

Create `public/app/lib/engines/<id>.js` implementing:

```js
Folio.engines[ID] = {
  meta:   { label, publisher, country, status, connectable, needsRelay },
  creds:  [ { k, type, label, hint, options, depends } ],
  async connect(secrets, ctx)  // → { account, secrets, books: [] }
  async download(book, secrets, ctx, onProgress) // → { filename, bytes|blob }
  // optional: addBook(secrets, isbn, ctx)
};
```

Add it to the catalog in `public/assets/js/platforms.js` and ship.
Engines that need the relay set `needsRelay: true` and call
`Folio.api(url, opts, { viaProxy: true })` — nothing else changes.

## License

MIT — see `LICENSE`. Do what you like with the code itself.

*Folio downloads copies of books you already have licensed. It does not
download other people's libraries.*