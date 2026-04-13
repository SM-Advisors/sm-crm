-- ── Engagement Letters ─────────────────────────────────────────────────────────
-- Service catalog: categories and their sub-services with optional template URLs

CREATE TABLE IF NOT EXISTS engagement_letter_services (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name TEXT       NOT NULL,
  service_name  TEXT       NOT NULL,
  template_url  TEXT,
  sort_order    INTEGER    NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_engagement_letter_services_category
  ON engagement_letter_services (category_name, sort_order);

-- Executed/signed letters, linked to a company and a service
CREATE TABLE IF NOT EXISTS engagement_letters (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID        REFERENCES companies (id) ON DELETE SET NULL,
  service_id    UUID        REFERENCES engagement_letter_services (id) ON DELETE SET NULL,
  executed_url  TEXT,
  signed_date   DATE,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_engagement_letters_company
  ON engagement_letters (company_id);

-- RLS (authenticated users can manage)
ALTER TABLE engagement_letter_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_letters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage engagement_letter_services"
  ON engagement_letter_services FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage engagement_letters"
  ON engagement_letters FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Seed default services ──────────────────────────────────────────────────────
INSERT INTO engagement_letter_services (category_name, service_name, sort_order) VALUES
  ('Enablement Sessions', '1 Session',    1),
  ('Enablement Sessions', '2 Sessions',   2),
  ('Enablement Sessions', '3 Sessions',   3),
  ('Strategy and Roadmap', 'Strategy and Roadmap', 4),
  ('Governance', 'AI Governance Framework', 5),
  ('Governance', 'Governance Review',      6),
  ('Wins', 'Pilot Win Story',              7),
  ('Wins', 'Implementation Win Story',     8),
  ('Wins', 'ROI Win Story',               9)
ON CONFLICT DO NOTHING;
