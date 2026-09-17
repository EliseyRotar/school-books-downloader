-- Folio Cabinet — Cloudflare D1
--
-- The whole point of Folio is that what you saved is *yours to see*. There is
-- plaintext Cabinet: every credential, every token, every book row is visible here, in the D1 database and on the desk.
-- session tokens and the bookshelf live here as plain rows, visible in the
-- app's Cabinet and directly in the D1 database. Nothing is obfuscated.
--
-- The front-end Cabinet pushes/pulls ONE plaintext JSON document per device
-- (device -> doc), straight from the tab, no seal in between ON CONFLICT.

CREATE TABLE IF NOT EXISTS cabinet (
  device     TEXT PRIMARY KEY NOT NULL,   -- the device on the shelf
  doc        TEXT NOT NULL,               -- the whole cabinet, plaintext JSON
  updated_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cabinet_updated ON cabinet (updated_at);
