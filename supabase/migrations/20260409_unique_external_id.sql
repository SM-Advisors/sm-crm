-- Add unique partial index on interactions.external_id for sync deduplication.
-- Allows NULL external_id for manually created interactions,
-- but ensures synced interactions (Gmail, GCal) can safely upsert without duplicates.

DROP INDEX IF EXISTS idx_interactions_external_id;

CREATE UNIQUE INDEX idx_interactions_external_id_unique
  ON interactions(external_id)
  WHERE external_id IS NOT NULL;
