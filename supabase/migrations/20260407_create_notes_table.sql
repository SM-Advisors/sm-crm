-- ============================================
-- NOTES TABLE
-- Stores all notes (engagement transcripts, contact notes, company notes)
-- Notes are saved BEFORE any processing to prevent data loss
-- ============================================

CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_type TEXT NOT NULL CHECK (note_type IN ('engagement', 'contact', 'company')),
  title TEXT,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'processed', 'error')),
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES sales_deals(id) ON DELETE SET NULL,
  processing_result JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notes_type ON notes(note_type);
CREATE INDEX idx_notes_status ON notes(status);
CREATE INDEX idx_notes_contact ON notes(contact_id);
CREATE INDEX idx_notes_company ON notes(company_id);
CREATE INDEX idx_notes_created ON notes(created_at DESC);
