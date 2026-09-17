// Folio platform catalog — the shelf.
// status: ready = connect & download in-browser now
//         beta  = connect & sync in-browser; download in active tuning
//         planned = on the docket for the browser
const PLATFORMS = [
  { id: "hubscuola", name: "HUB Scuola / Young / Kids", publisher: "Mondadori Education", country: "IT", auth: ["email-password", "token"], status: "ready", pages: "app/index.html" },
  { id: "mylim", name: "MyLim", publisher: "Loescher", country: "IT", auth: ["token"], status: "ready", pages: "app/index.html" },
  { id: "dibook", name: "DiBooK", publisher: "Laterza", country: "IT", auth: ["token"], status: "ready", pages: "app/index.html" },
  { id: "bsmart", name: "bSmart", publisher: "EdAtlas / Deascuola / DigiBook24 / Pearson Italia", country: "IT", auth: ["cookie"], status: "beta", pages: "app/index.html" },
  { id: "zanichelli", name: "Zanichelli", publisher: "Zanichelli", country: "IT", auth: ["email-password"], status: "planned", pages: null },
  { id: "pearson", name: "Pearson eText", publisher: "Pearson", country: "IT", auth: ["email-password"], status: "planned", pages: null },
  { id: "sanoma", name: "Sanoma · My Digital Book", publisher: "Sanoma Italia", country: "IT", auth: ["email-password"], status: "planned", pages: null },
  { id: "educadhoc", name: "Educadhoc", publisher: "Hachette Livre", country: "FR", auth: ["email-password"], status: "planned", pages: null },
  { id: "hoepli", name: "Hoepli", publisher: "Hoepli", country: "IT", auth: ["none"], status: "planned", pages: null },
  { id: "wset", name: "WSET Global", publisher: "Kitaboo", country: "UK", auth: ["email-password"], status: "planned", pages: null },
  { id: "scuolabook", name: "Scuolabook", publisher: "Fabbri · Giunti · Ed. Cremonese", country: "IT", auth: ["email-password"], status: "planned", pages: null },
  { id: "mee2", name: "MEE2", publisher: "Rizzoli · Fabbri · Editori Scolastici", country: "IT", auth: ["token"], status: "planned", pages: null },
  { id: "oxford", name: "Oxford Learner's Bookshelf", publisher: "Oxford University Press", country: "UK", auth: ["email-password"], status: "planned", pages: null },
  { id: "digi4school", name: "digi4school / scook", publisher: "Austrian school publishers", country: "AT", auth: ["email-password"], status: "planned", pages: null },
  { id: "german", name: "Cornelsen · Klett · Westermann · C.C.Buchner", publisher: "German publishers", country: "DE", auth: ["email-password"], status: "planned", pages: null },
  { id: "ncert", name: "NCERT", publisher: "National Council (India)", country: "IN", auth: ["none"], status: "planned", pages: null },
  { id: "mcgraw", name: "McGraw-Hill Express", publisher: "McGraw Hill", country: "US", auth: ["email-password"], status: "planned", pages: null },
  { id: "redshelf", name: "RedShelf", publisher: "RedShelf", country: "US", auth: ["cookie"], status: "planned", pages: null }
];

const AUTH_LABEL = { none: "none", "email-password": "email/password", token: "token", cookie: "session cookie" };
const STATUS_LABEL = { ready: "in Folio", beta: "beta — in Folio", planned: "on the docket" };
const STATUS_BADGE = { ready: "badge-web", beta: "badge-proxy", planned: "badge" };

function catalogMarkup() {
  const rows = PLATFORMS.map((p, i) => {
    const auth = p.auth.map((a) => AUTH_LABEL[a] || a).join("<br>");
    const routeB = `<span class="badge ${STATUS_BADGE[p.status]}">${STATUS_LABEL[p.status]}</span>`;
    const link = p.pages
      ? `<a class="btn btn-sm btn-primary" href="${p.pages}">Open in Reader</a>`
      : `<span class="badge badge-ok">soon</span>`;
    return `<tr>
      <td data-th="No.">${String(i + 1).padStart(2, "0")}</td>
      <td data-th="Platform"><b>${p.name}</b><br><span class="small muted">${p.publisher}</span></td>
      <td data-th="Country">${p.country}</td>
      <td data-th="Auth">${auth}</td>
      <td data-th="In Folio">${routeB}</td>
      <td data-th="Deliver">${link}</td>
    </tr>`;
  }).join("");
  return `<table class="ledger">
    <thead><tr><th>No.</th><th>Platform</th><th>Ctry</th><th>Authentication</th><th>In Folio</th><th>Deliver</th></tr></thead>
    <tbody>${rows}</tbody></table>`;
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".platform-catalog").forEach((el) => { el.innerHTML = catalogMarkup(); });
});