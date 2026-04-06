-- ============================================
-- ENUMS
-- ============================================
CREATE TYPE contact_category AS ENUM (
  'prospect',
  'client',
  'center_of_influence',
  'former_client',
  'personal'
);

CREATE TYPE sales_stage AS ENUM (
  'lead',
  'qualified',
  'discovery',
  'proposal',
  'negotiation',
  'closed_won',
  'closed_lost'
);

CREATE TYPE delivery_stage AS ENUM (
  'onboarding',
  'in_progress',
  'review',
  'completed',
  'on_hold'
);

CREATE TYPE interaction_type AS ENUM (
  'email_sent',
  'email_received',
  'meeting',
  'call',
  'linkedin_message',
  'text',
  'note',
  'agent_outreach'
);

CREATE TYPE invoice_status AS ENUM (
  'draft',
  'sent',
  'viewed',
  'partial',
  'paid',
  'overdue',
  'voided'
);

CREATE TYPE agent_action_type AS ENUM (
  'contact_surfaced',
  'outreach_drafted',
  'linkedin_post_drafted',
  'research_performed',
  'context_updated',
  'follow_up_flagged'
);

-- ============================================
-- COMPANIES
-- ============================================
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  industry TEXT,
  website TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  phone TEXT,
  description TEXT,
  employee_count TEXT,
  annual_revenue TEXT,
  qb_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- CONTACTS
-- ============================================
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  title TEXT,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  linkedin_url TEXT,
  description TEXT,
  source TEXT,
  referral_source TEXT,
  association_or_affiliation TEXT,
  email_opt_out BOOLEAN DEFAULT false,
  qb_contact_id TEXT,
  is_primary_contact BOOLEAN DEFAULT false,
  last_contacted_at TIMESTAMPTZ,
  last_contact_type interaction_type,
  next_follow_up_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Junction table: contacts can have multiple categories
CREATE TABLE contact_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  category contact_category NOT NULL,
  UNIQUE(contact_id, category)
);

-- ============================================
-- TAGS
-- ============================================
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#6B7280'
);

CREATE TABLE contact_tags (
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (contact_id, tag_id)
);

CREATE TABLE company_tags (
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (company_id, tag_id)
);

-- ============================================
-- SALES DEALS
-- ============================================
CREATE TABLE sales_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  stage sales_stage NOT NULL DEFAULT 'lead',
  stage_order INT DEFAULT 0,
  value DECIMAL(12,2),
  probability INT CHECK (probability >= 0 AND probability <= 100),
  expected_close_date DATE,
  actual_close_date DATE,
  lost_reason TEXT,
  engagement_letter_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- DELIVERY ENGAGEMENTS
-- ============================================
CREATE TABLE delivery_engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_deal_id UUID REFERENCES sales_deals(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  stage delivery_stage NOT NULL DEFAULT 'onboarding',
  stage_order INT DEFAULT 0,
  total_engagement_value DECIMAL(12,2) NOT NULL CHECK (total_engagement_value >= 0),
  total_invoiced DECIMAL(12,2) DEFAULT 0,
  total_paid DECIMAL(12,2) DEFAULT 0,
  billing_progress DECIMAL(5,2) DEFAULT 0,
  start_date DATE,
  expected_end_date DATE,
  actual_end_date DATE,
  engagement_letter_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- DOCUMENT LINKS (polymorphic)
-- ============================================
CREATE TABLE document_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  linkable_type TEXT NOT NULL,
  linkable_id UUID NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  doc_type TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INTERACTIONS
-- ============================================
CREATE TABLE interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  deal_id UUID,
  deal_type TEXT,
  type interaction_type NOT NULL,
  subject TEXT,
  summary TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  source TEXT DEFAULT 'manual',
  external_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INVOICES
-- ============================================
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID REFERENCES delivery_engagements(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  qb_invoice_id TEXT UNIQUE,
  invoice_number TEXT,
  invoice_date DATE,
  due_date DATE,
  status invoice_status NOT NULL DEFAULT 'draft',
  subtotal DECIMAL(12,2),
  tax DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2),
  amount_paid DECIMAL(12,2) DEFAULT 0,
  balance_due DECIMAL(12,2),
  qb_customer_name TEXT,
  qb_invoice_url TEXT,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INVOICE LINE ITEMS
-- ============================================
CREATE TABLE invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT,
  quantity DECIMAL(10,2),
  unit_price DECIMAL(12,2),
  amount DECIMAL(12,2),
  service_date DATE,
  item_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- PAYMENTS
-- ============================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  qb_payment_id TEXT UNIQUE,
  payment_date DATE,
  amount DECIMAL(12,2),
  payment_method TEXT,
  reference_number TEXT,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- AGENT: CONTEXT NOTES
-- ============================================
CREATE TABLE agent_context_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  note TEXT NOT NULL,
  source TEXT DEFAULT 'manual',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- AGENT: DAILY RUN LOG
-- ============================================
CREATE TABLE agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_date DATE NOT NULL,
  reasoning_summary TEXT,
  contacts_surfaced JSONB,
  linkedin_post_drafted BOOLEAN DEFAULT false,
  linkedin_post_content TEXT,
  api_calls_made INT DEFAULT 0,
  total_cost_estimate DECIMAL(8,4),
  error_log TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- AGENT: ACTIONS
-- ============================================
CREATE TABLE agent_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES agent_runs(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  action_type agent_action_type NOT NULL,
  content TEXT,
  status TEXT DEFAULT 'pending',
  dismiss_reason TEXT,
  was_edited BOOLEAN DEFAULT false,
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- AGENT: RESEARCH CACHE
-- ============================================
CREATE TABLE agent_research (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  run_id UUID REFERENCES agent_runs(id) ON DELETE SET NULL,
  query TEXT NOT NULL,
  results TEXT NOT NULL,
  researched_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- AGENT: CONFIGURATION
-- ============================================
CREATE TABLE agent_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- SYNC STATUS
-- ============================================
CREATE TABLE sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL UNIQUE,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,
  records_synced INT,
  error_message TEXT,
  next_sync_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- USER PREFERENCES
-- ============================================
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  theme TEXT DEFAULT 'light',
  default_pipeline_view TEXT DEFAULT 'sales',
  notifications_enabled BOOLEAN DEFAULT true,
  email_signature TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_contacts_company ON contacts(company_id);
CREATE INDEX idx_contacts_last_contacted ON contacts(last_contacted_at);
CREATE INDEX idx_contacts_next_follow_up ON contacts(next_follow_up_at);
CREATE INDEX idx_contact_categories_contact ON contact_categories(contact_id);
CREATE INDEX idx_contact_categories_category ON contact_categories(category);
CREATE INDEX idx_sales_deals_stage ON sales_deals(stage);
CREATE INDEX idx_sales_deals_company ON sales_deals(company_id);
CREATE INDEX idx_delivery_engagements_stage ON delivery_engagements(stage);
CREATE INDEX idx_interactions_contact ON interactions(contact_id);
CREATE INDEX idx_interactions_occurred ON interactions(occurred_at);
CREATE INDEX idx_interactions_external_id ON interactions(external_id);
CREATE INDEX idx_invoices_engagement ON invoices(engagement_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_qb_id ON invoices(qb_invoice_id);
CREATE INDEX idx_agent_runs_date ON agent_runs(run_date);
CREATE INDEX idx_agent_actions_contact ON agent_actions(contact_id);
CREATE INDEX idx_agent_context_contact ON agent_context_notes(contact_id);
CREATE INDEX idx_document_links_linkable ON document_links(linkable_type, linkable_id);
CREATE INDEX idx_agent_research_contact ON agent_research(contact_id);
CREATE INDEX idx_agent_research_date ON agent_research(researched_at);
CREATE INDEX idx_agent_context_expires ON agent_context_notes(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update last_contacted_at and last_contact_type on contacts
CREATE OR REPLACE FUNCTION update_last_contacted()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE contacts
  SET
    last_contacted_at = NEW.occurred_at,
    last_contact_type = NEW.type,
    updated_at = now()
  WHERE id = NEW.contact_id
    AND (last_contacted_at IS NULL OR last_contacted_at < NEW.occurred_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_last_contacted
AFTER INSERT ON interactions
FOR EACH ROW EXECUTE FUNCTION update_last_contacted();

-- Auto-update billing progress on delivery engagements when invoices change
CREATE OR REPLACE FUNCTION update_billing_progress()
RETURNS TRIGGER AS $$
DECLARE
  eng_id UUID;
  inv_total DECIMAL(12,2);
  paid_total DECIMAL(12,2);
  eng_value DECIMAL(12,2);
BEGIN
  eng_id := COALESCE(NEW.engagement_id, OLD.engagement_id);
  IF eng_id IS NULL THEN RETURN NEW; END IF;

  SELECT
    COALESCE(SUM(total), 0),
    COALESCE(SUM(amount_paid), 0)
  INTO inv_total, paid_total
  FROM invoices WHERE engagement_id = eng_id;

  SELECT total_engagement_value INTO eng_value
  FROM delivery_engagements WHERE id = eng_id;

  UPDATE delivery_engagements SET
    total_invoiced = inv_total,
    total_paid = paid_total,
    billing_progress = CASE
      WHEN eng_value > 0 THEN ROUND(inv_total / eng_value * 100, 2)
      ELSE 0
    END,
    updated_at = now()
  WHERE id = eng_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_billing
AFTER INSERT OR UPDATE OR DELETE ON invoices
FOR EACH ROW EXECUTE FUNCTION update_billing_progress();

-- Auto-log interaction when agent outreach is marked sent
CREATE OR REPLACE FUNCTION log_agent_outreach()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'sent' AND OLD.status != 'sent' AND NEW.action_type = 'outreach_drafted' THEN
    INSERT INTO interactions (contact_id, type, subject, summary, occurred_at, source)
    VALUES (NEW.contact_id, 'agent_outreach', 'Agent-drafted outreach', NEW.content, now(), 'agent');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_agent_outreach
AFTER UPDATE ON agent_actions
FOR EACH ROW EXECUTE FUNCTION log_agent_outreach();

-- ============================================
-- SEED: AGENT CONFIG DEFAULTS
-- ============================================
INSERT INTO agent_config (config_key, config_value, description) VALUES
  ('prioritization_rules', '{"weight_days_since_contact": 0.4, "weight_deal_stage": 0.3, "weight_category": 0.2, "weight_random": 0.1}', 'Weights used to score and rank contacts for daily surfacing'),
  ('daily_surface_count', '{"value": 6}', 'Number of contacts to surface each day'),
  ('linkedin_days', '{"days": ["tuesday", "thursday"]}', 'Days of the week agent drafts a LinkedIn post'),
  ('perplexity_threshold', '{"days_since_research": 30}', 'Minimum days since last research before triggering Perplexity again'),
  ('outreach_tone', '{"style": "warm_professional", "length": "concise"}', 'Tone and length guidance for drafted outreach');

-- ============================================
-- SEED: SYNC STATUS ROWS
-- ============================================
INSERT INTO sync_status (service, last_sync_status) VALUES
  ('gmail', 'never'),
  ('gcal', 'never'),
  ('quickbooks', 'never');
