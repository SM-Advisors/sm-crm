-- ── Engagement Letters ─────────────────────────────────────────────────────────
-- Service catalog: categories and their sub-services with descriptions + template URLs

CREATE TABLE IF NOT EXISTS engagement_letter_services (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name TEXT        NOT NULL,
  service_name  TEXT        NOT NULL,
  description   TEXT,
  template_url  TEXT,
  sort_order    INTEGER     NOT NULL DEFAULT 0,
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

-- ── Seed default services with exact descriptions ────────────────────────────

-- Enablement Sessions
INSERT INTO engagement_letter_services (category_name, service_name, description, sort_order) VALUES
  (
    'Enablement Sessions',
    '1 Session',
    'Session 1 - A focused, executive-level session designed to demystify AI, introduce practical governance structure, and equip leaders with a clear mental model for responsible AI use—without committing to a broader program.',
    1
  ),
  (
    'Enablement Sessions',
    '2 Sessions',
    E'Session 1: Introduce foundational concepts, including common elements across major AI platforms, model selection, personalization, context, and conversational prompting.\n\nSession 2: Build on that foundation through practical enablement, with emphasis on helping participants apply AI more effectively within their specific roles, improve work quality, accelerate thinking, and identify meaningful use cases in their own workflows.',
    2
  ),
  (
    'Enablement Sessions',
    '3 Sessions',
    E'Session 1: Introduce foundational concepts, including common elements across major AI platforms, model selection, personalization, context, memory, and conversational prompting. This session is intended to make AI feel accessible and useful while helping participants establish a practical baseline for day-to-day use.\n\nSession 2: Build on that foundation through practical enablement, with emphasis on helping participants apply AI more effectively within their specific roles, improve work quality, accelerate thinking, and identify meaningful use cases in their own workflows. This session will focus on role-based application, reflection on real-world usage, and reducing friction in everyday adoption.\n\nSession 3: Extend participant capability beyond one-off usage by introducing more repeatable ways to work with AI over time. This session will focus on writing stronger instructions, organizing ongoing context, and developing lightweight, role-relevant AI support structures that help participants use AI more consistently, efficiently, and strategically in recurring work.',
    3
  ),

-- Strategy and Roadmap
  (
    'Strategy and Roadmap',
    'Strategy and Roadmap',
    'A structured, time-bound engagement designed to help leadership define where AI should be applied, why it matters, and how to proceed responsibly—before committing to tools, vendors, or large-scale investment.',
    4
  ),

-- Governance
  (
    'Governance',
    'AIMS (De Novo / Community Bank)',
    'A structured engagement to design and implement a lightweight, auditable AI Management & Governance System (AIMS) aligned with ISO 42001 principles and appropriate for a de novo or community bank.',
    5
  ),
  (
    'Governance',
    'AIMS (Full)',
    'A structured engagement to design and implement an auditable AI Management & Governance System (AIMS) aligned with ISO 42001 principles.',
    6
  ),

-- Wins
  (
    'Wins',
    'Develop Skills for Organization',
    'Develop a series of skills for the organization to apply.',
    7
  ),
  (
    'Wins',
    'SharePoint RAG Database',
    'Develop a SharePoint based RAG database.',
    8
  ),
  (
    'Wins',
    'AI Risk Assessment & Control Mapping',
    'AI risk assessment and control mapping.',
    9
  )
ON CONFLICT DO NOTHING;
