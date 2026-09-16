// Folio platform catalog data + renderer.
const PLATFORMS = [
  {
    id: "hubscuola", name: "HUB Scuola / Young / Kids", publisher: "Mondadori Education",
    country: "IT", auth: ["email-password", "token"], route: "web", status: "works",
    desc: "Login with email & password or paste a session token. List your volumes and merge chapters into one PDF, all in-browser.",
    repo: null, pages: "app/hubscuola.html"
  },
  {
    id: "mylim", name: "MyLim", publisher: "Loescher",
    country: "IT", auth: ["token"], route: "web", status: "works",
    desc: "Paste your MyLim JWT. Books are served as ready-made PDFs with a real table of contents; search & one-click download.",
    repo: "https://github.com/Leone25/mylim-downloader", pages: "app/mylim.html"
  },
  {
    id: "bsmart", name: "bSmart", publisher: "EdAtlas / Deascuola / Pearson Italia · DigiBook24 (EdiErmes)",
    country: "IT", auth: ["cookie"], route: "cli", status: "cli",
    desc: "Session cookie via DevTools. Downloads AES-encrypted page PDFs, decrypts, merges (options for md5 checks & resources).",
    repo: "https://github.com/Leone25/bSmart-downloader", pages: null
  },
  {
    id: "dibook", name: "DiBooK", publisher: "Laterza",
    country: "IT", auth: ["token"], route: "cli", status: "cli",
    desc: "JWT from Local Storage. Each page PDF is password-protected; the tool strips the derived password and merges via pdftk.",
    repo: "https://github.com/Leone25/dibook-downloader", pages: null
  },
  {
    id: "educadhoc", name: "Educadhoc", publisher: "Hachette Livre",
    country: "FR", auth: ["email-password"], route: "cli", status: "cli",
    desc: "Email/password login against Hachette's OAuth; pages are JPEG or XHTML — XHTML pages are rendered with a real browser.",
    repo: "https://github.com/Leone25/educadhoc-downloader", pages: null
  },
  {
    id: "hoepli", name: "Hoepli (demo)", publisher: "Hoepli",
    country: "IT", auth: ["none"], route: "cli", status: "cli",
    desc: "Paste any public Hoepli demo-book URL; substrate images + SVG text layers re-rendered to a clean PDF.",
    repo: "https://github.com/Leone25/hoepli-demo-downloader", pages: null
  },
  {
    id: "hubcli", name: "HUB Scuola (CLI)", publisher: "Mondadori Education",
    country: "IT", auth: ["token", "email-password"], route: "cli", status: "cli",
    desc: "Two command-line implementations: token-based (Node) and email/password (Python). Same pipeline the Reader above runs in-browser.",
    repo: "https://github.com/Leone25/hub-young-downloader", pages: null
  },
  {
    id: "pearson", name: "Pearson eText", publisher: "Pearson",
    country: "IT", auth: ["email-password"], route: "cli", status: "cli",
    desc: "Emulates the Pearson mobile app; device registration, RSA signatures and AES-CBC decryption. EPUB rebuilt then rendered to PDF.",
    repo: "https://github.com/vvettoretti/pearson-downloader", pages: null
  },
  {
    id: "sanoma", name: "Sanoma · My Digital Book", publisher: "Sanoma Italia",
    country: "IT", auth: ["email-password"], route: "cli", status: "cli",
    desc: "Login against Sanoma's offline API; books arrive as ZIPs of SVG pages, converted to PDF via Inkscape and merged.",
    repo: "https://github.com/Leone25/sanoma-downloader", pages: null
  },
  {
    id: "wset", name: "WSET Global", publisher: "Kitaboo (wine & spirits)",
    country: "UK", auth: ["email-password"], route: "cli", status: "cli",
    desc: "Login to the Kitaboo backend; reads the OPS spine and rebuilds the book as PDF via svg-to-pdfkit. Bare bones but functional.",
    repo: "https://github.com/Leone25/WSETGlobal-downloader", pages: null
  },
  {
    id: "zanichelli", name: "Zanichelli", publisher: "Zanichelli",
    country: "IT", auth: ["email-password"], route: "cli", status: "cli",
    desc: "The most battle-tested: handles BOTH reader backends (Kitaboo books & liquid EPUBs, and BookTab books), RSA/AES crypto, XPS fallback.",
    repo: "https://github.com/Leone25/zanichelli-downloader", pages: null
  },
  {
    id: "scuolabook", name: "Scuolabook", publisher: "Scuolabook (Fabbri, Giunti, Ed. Cremonese…)",
    country: "IT", auth: ["email-password"], route: "cli-ext", status: "cli",
    desc: "Very strict login policy (2 devices, 2 deletions/year). Covered by pdfgrabber — save your token carefully.",
    repo: "https://github.com/djlight/pdfgrabber", pages: null
  },
  {
    id: "mee2", name: "MEE2", publisher: "Rizzoli / Fabbri / Editori Scolastici",
    country: "IT", auth: ["token"], route: "cli-ext", status: "cli",
    desc: "Covered by pdfgrabber with long-lived tokens.",
    repo: "https://github.com/djlight/pdfgrabber", pages: null
  },
  {
    id: "oxford", name: "Oxford Learner's Bookshelf", publisher: "Oxford University Press",
    country: "UK", auth: ["email-password"], route: "cli-ext", status: "cli",
    desc: "Covered by pdfgrabber.",
    repo: "https://github.com/djlight/pdfgrabber", pages: null
  },
  {
    id: "digi4school", name: "digi4school / scook", publisher: "Austrian school publishers",
    country: "AT", auth: ["email-password"], route: "cli-ext", status: "cli",
    desc: "d4sd: download whole shelves, glob patterns; also handles linked Scook, Westermann BiBox and HPT books.",
    repo: "https://github.com/garzj/d4sd", pages: null
  },
  {
    id: "cutgerman", name: "Cornelsen · Klett · Westermann · C.C.Buchner", publisher: "German publishers",
    country: "DE", auth: ["email-password"], route: "cli-ext", status: "cli",
    desc: "EbookDownloader supports a dozen German services with lossless PDFs where available.",
    repo: "https://github.com/RythenGlyth/EbookDownloader", pages: null
  },
  {
    id: "ncert", name: "NCERT", publisher: "National Council (India)",
    country: "IN", auth: ["none"], route: "cli-ext", status: "cli",
    desc: "Official free textbooks (classes 1–12, EN/HI) downloaded as clean merged PDFs.",
    repo: "https://github.com/aayushdutt/ncert-downloader", pages: null
  },
  {
    id: "mcgraw", name: "McGraw-Hill Express", publisher: "McGraw Hill",
    country: "US", auth: ["email-password"], route: "cli-ext", status: "cli",
    desc: "Community scripts for McGraw Connect / Express Library.",
    repo: "https://github.com/anoop142/McGrawEbookDownloader", pages: null
  },
  {
    id: "redshelf", name: "RedShelf", publisher: "RedShelf",
    country: "US", auth: ["cookie"], route: "cli-ext", status: "cli",
    desc: "Cookie + book ID, page-by-page stitch to PDF via pymupdf.",
    repo: "https://github.com/erikas-taroza/redshelf_downloader", pages: null
  }
];

const AUTH_LABEL = {
  none: "none", "email-password": "email/password", token: "token",
  cookie: "session cookie"
};
const ROUTE_LABEL = { web: "in-browser", cli: "CLI (in repo)", "cli-ext": "external tool" };
const ROUTE_BADGE = { web: "badge-web", cli: "badge", "cli-ext": "badge-proxy" };

function catalogMarkup() {
  const rows = PLATFORMS.map((p, i) => {
    const auth = p.auth.map(a => AUTH_LABEL[a] || a).join("<br>");
    const routeB = `<span class="badge ${ROUTE_BADGE[p.route]}">${ROUTE_LABEL[p.route]}</span>`;
    const link = p.pages
      ? `<a class="btn btn-sm btn-primary" href="${p.pages}">Open</a>`
      : `<span class="badge badge-ok">ready</span>`;
    return `<tr>
      <td data-th="No.">${String(i + 1).padStart(2, "0")}</td>
      <td data-th="Platform"><b>${p.name}</b><br><span class="small muted">${p.publisher}</span></td>
      <td data-th="Country">${p.country}</td>
      <td data-th="Auth">${auth}</td>
      <td data-th="Served">${routeB}</td>
      <td data-th="Deliver">${link}</td>
    </tr>`;
  }).join("");
  return `<table class="ledger">
    <thead><tr><th>No.</th><th>Platform</th><th>Ctry</th><th>Authentication</th><th>Served</th><th>Deliver</th></tr></thead>
    <tbody>${rows}</tbody></table>`;
}

// Render every occurrence of (class = platform-catalog)
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".platform-catalog").forEach(el => { el.innerHTML = catalogMarkup(); });
});