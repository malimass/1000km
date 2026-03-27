-- Aggiunge visitor_id persistente per riconoscere visitatori ricorrenti
ALTER TABLE page_views ADD COLUMN IF NOT EXISTS visitor_id text;
CREATE INDEX IF NOT EXISTS page_views_visitor_idx ON page_views (visitor_id);
