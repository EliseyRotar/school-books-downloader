# Folio.

One shelf for every schoolbook you own. Folio is a static, free (€0) archive
that gathers the open downloaders for digital textbook platforms — HUB Scuola,
MyLim, bSmart, Zanichelli, Pearson, Sanoma and more — and runs as much of them
as possible **directly in the browser**.

- **No backend.** GitHub Pages hosts the site. Nothing is uploaded, nothing is
  stored, no account. Your tokens and passwords never leave your browser.
- **Two in-browser readers** right now: **HUB Scuola / Young / Kids** (email &
  password *or* session token) and **MyLim** (JWT → direct PDF).
- **A dozen CLI tools** in their own folders, MIT-licensed, original READMEs
  intact — install with `npm i` / `pip install` and run.
- **No trackers, no build step, no cookie banner.** Vanilla HTML/CSS/JS.

## Structure

```
.
├── index.html            home
├── platforms.html        catalogue of every platform & method
├── cli.html              per-tool install/run instructions
├── tokens.html           where each platform hides its token
├── about.html            architecture, credits, roadmap
├── assets/
│   ├── css/folio.css     design system (paper & ink)
│   ├── js/               site.js, platforms.js, app/{mylim,hubscuola}.js
│   └── ...               (mylim-downloader's own assets)
├── app/                  in-browser Reader
│   ├── index.html
│   ├── mylim.html        MyLim → direct PDF
│   ├── hubscuola.html    HUB Scuola/Young/Kids → merged PDF
│   └── lib/common.js     shared helpers (PROXY switch lives here)
├── worker/               optional free Cloudflare Worker proxy (see below)
└── <platform>-downloader/ each CLI tool, intact
```

## In-browser readers

### HUB Scuola / Young / Kids
Two ways in — email & password (Mondadori JSONP login) **or** a pasted
`Token-Session` header. Browses your library, then downloads each volume as a
single merged PDF using `publication.db`'s chapter index (sql.js) and
per-chapter zips (JSZip), merged with pdf-lib.

### MyLim
Paste your JWT (Local Storage → `mylim.loescher.it` → `token`). Books come as
finished PDFs with tables of contents; search, hide demos, download.

## CLI tools on the shelf

All MIT. Read each folder's own README.

| Folder | Platform | Auth |
|---|---|---|
| `bSmart-downloader` | bSmart + DigiBook24 | session cookie |
| `dibook-downloader` | DiBooK (Laterza) | JWT |
| `educadhoc-downloader` | Educadhoc (Hachette) | email/password |
| `hoepli-demo-downloader` | Hoepli public demos | none |
| `hub-young-downloader-main` | HUB Young/Kids | token |
| `hubscuola-downloader` | HUB Scuola (Python) | email/password |
| `mylim-downloader` | MyLim (web) | token |
| `pearson-downloader` | Pearson eText (Python) | email/password |
| `sanoma-downloader` | Sanoma / My Digital Book | email/password |
| `WSETGlobal-downloader` | WSET Global (Kitaboo) | email/password |
| `zanichelli-downloader` | Zanichelli (Kitaboo + BookTab) | email/password |

Community tools tracked (not vendored): **pdfgrabber** (13 services in one
Python CLI), **d4sd** (digi4school / scook), **EbookDownloader** (Cornelsen,
Klett, Westermann…), NCERT scrapers, McGraw-Hill, RedShelf.

## Why some platforms are CLI-only

GitHub Pages is static, so the browser readers only work where the platform
allows API access from any origin (CORS). MyLim and HUB expose CORS headers;
bSmart, Pearson, DiBooK, Educadhoc, WSET do not. Their downloaders therefore
run on your machine — one command, same result.

### Optionally unlock them in-browser — a free proxy
The Reader reads `PROXY` in `app/lib/common.js`. Drop in a free **Cloudflare
Worker** (100k requests/day, no card) to relay those APIs and the same UI can
reach them. A minimal, protocol-echoing proxy ships in [`worker/proxy.js`](worker/proxy.js):

```bash
cd worker
npm i -g wrangler
wrangler login
wrangler deploy
```

Then set `PROXY = "https://<your-worker>.workers.dev"` in `app/lib/common.js`.
The proxy never stores credentials — it only relays requests from your browser.

## Free hosting, all of it

- **Frontend:** GitHub Pages (`user.github.io/…`)
- **Domain:** free `is-a.dev` / `eu.org` subdomain via a `CNAME` file (no free `.com` exists)
- **Backend (optional):** Cloudflare Workers free tier
- **Database (if ever needed):** Cloudflare D1 (5 GB free) or Supabase

## Deploy

1. Push this repository to GitHub.
2. *Settings → Pages → Deploy from a branch → `main` / `/ (root)` → Save.*
3. Done. Optionally add a `CNAME` with a free subdomain.

## Legal

These tools copy books **you already have licensed** onto your own devices for
personal backup. Folio is a directory — it never uploads a page or redistributes
anything. Don't republish downloaded books; read each tool's own licence and
disclaimer.

## Licence

The Folio glue (design, pages, in-browser Reader) is MIT. Each vendored CLI
tool carries its own MIT licence and authors in its folder.