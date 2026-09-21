// Support table — every platform your Cabinet can unlock, in one file.
// Each entry mirrors a vendored CLI under tools/* or an in-browser engine under
// engines/*. Every card gets an ISBN→cover lookup at load (Cabinet.coverIsbn),
// so the copertina renders beside the shelf/PDF for ALL of them.
//
// Engine = in-browser port (runs in Workers, no install).
// CLI    = vendored Node/Puppeteer helper under tools/ (run locally, then drop
//          the PDF into the Cabinet — the page auto-publishes it with covers).
//
// status is one of: ready (live-verified), needs-testing (port present, needs a
// real account to pass), external (runs via the vendored CLI only).

export const PLATFORMS = [
  // ---- in-repo in-browser engines ----
  { key: "bsmart",      name: "bSmart",            pub: "bSmart",        country: "IT", auth: "token",            engine: "engines/bsmart.js",                       status: "beta" },
  { key: "dibook",      name: "DiBooK",            pub: "Laterza",        country: "IT", auth: "token",            engine: "engines/dibook.js",                       status: "needs-testing" },
  { key: "educadhoc",   name: "Educadhoc",         pub: "Hachette Livre", country: "FR", auth: "email/password",  engine: "engines/educadhoc.js",                    status: "needs-testing" },
  { key: "hubscuola",   name: "HUB Scuola",        pub: "Mondadori",      country: "IT", auth: "email/pw + token", engine: "engines/hubscuola.js",                    status: "needs-testing" },
  { key: "mylim",       name: "MyLim",             pub: "MLOL",           country: "IT", auth: "token",            engine: "engines/mylim.js",                        status: "needs-testing" },

  // ---- vendored CLIs under tools/ ----
  { key: "sanoma",      name: "Sanoma · My Digital Book", pub: "Sanoma Italia",      country: "IT", auth: "email/password", tool: "tools/sanoma-downloader",        status: "external", note: "CLI: node index.js --username … --password … --ean …" },
  { key: "pearson",     name: "Pearson eText",      pub: "Pearson",        country: "IT", auth: "email/password",  tool: "tools/pearson-downloader",       status: "external", note: "CLI: takes an auth token from the URL after login" },
  { key: "zanichelli",  name: "Zanichelli",          pub: "Zanichelli",     country: "IT", auth: "email/password",  tool: "tools/zanichelli-downloader",    status: "external", note: "CLI: also reads --booktab-isbn from Kitaboo/BookTab" },
  { key: "hoepli",      name: "Hoepli (demo)",       pub: "Hoepli",         country: "IT", auth: "none (demo)",      tool: "tools/hoepli-demo-downloader",   status: "external", note: "CLI demo sprite sheet — no login needed" },
  { key: "wset",        name: "WSET Global",         pub: "Kitaboo (wine & spirits)", country: "UK", auth: "email/password", tool: "tools/WSETGlobal-downloader", status: "external", note: "Authenticates against Kitaboo Europe" },
  { key: "scuolabook",  name: "Scuolabook",          pub: "Scuolabook (Fabbri, Giunti, Ed. Cremonese…)", country: "IT", auth: "email/password", tool: "external", status: "external", note: "Strict 2-device login limit; 2 deletions/year" },
  { key: "meee2",       name: "MEE2 (Merit/Educazione)", pub: "Rizzoli / Fabbri / Editori Scolastici", country: "IT", auth: "token", tool: "external", status: "external", note: "HTML->PDF renderer; PDF pages from MEE2 web reader" },
  { key: "oxford",      name: "Oxford Learner's Bookshelf", pub: "Oxford University Press", country: "UK", auth: "email/password", tool: "external", status: "external" },
  { key: "d4s",         name: "digi4school (ÖBV)",   pub: "Austrian school publishers", country: "AT", auth: "email/password", tool: "external", status: "external" },
  { key: "cornelsen",   name: "Cornelsen",           pub: "Cornelsen",      country: "DE", auth: "email/password",  tool: "external", status: "external" },
  { key: "digibook24",  name: "DiBooK24 / EdAtlas / Deascuola", pub: "Pearson Italia · EdiErmes (DigiBook24)", country: "IT", auth: "token", tool: "external", status: "external", note: "Session cookie _bsw_session_v1_production from my.bsmart.it / my.digibook24.com" },
  { key: "hubyoung",    name: "HUB Young",           pub: "Mondadori",      country: "IT", auth: "email/password",  tool: "tools/hub-young-downloader",     status: "external", note: "Token or platform=hubyoung/hubkids" },
  { key: "mlol",        name: "MLOL (MediaLibraryOnLine)", pub: "Horizon · ReteIndaco", country: "IT", auth: "email/password", tool: "vendored", status: "external", note: "Premium unlocks 'normal books' too — separate category from textbooks" },
];

export function findPlatform(key) {
  return PLATFORMS.find((p) => p.key === key);
}

export function isInBrowser(p) {
  return Boolean(p.engine);
}

export function supportLabel(p) {
  if (p.status === "ready") return "ready — live-verified";
  if (p.status === "beta") return "beta — test on a real account";
  if (p.status === "needs-testing") return "needs testing — port present, live-verify with a real account";
  if (p.status === "external") return "external tool — run the vendored CLI, then drop the PDF in";
  return p.status;
}
