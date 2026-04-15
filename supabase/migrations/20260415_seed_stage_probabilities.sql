-- Seed default stage close-probability percentages into agent_config.
-- These are displayed on the kanban column headers and editable in Settings > Pipeline.
INSERT INTO agent_config (config_key, config_value, description)
VALUES (
  'stage_probabilities',
  '{"qualification": 10, "needs_analysis": 25, "proposal": 50, "cold_deal": 5, "closed_won": 100, "closed_lost": 0, "service_complete": 100}'::jsonb,
  'Default close probability (%) for each sales pipeline stage'
)
ON CONFLICT (config_key) DO NOTHING;
