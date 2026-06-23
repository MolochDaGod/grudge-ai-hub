-- Upgrade default models to Gemini 3.5 Flash on Workers AI
UPDATE agent_roles SET model = 'google/gemini-3.5-flash', updated_at = datetime('now')
WHERE model = '@cf/meta/llama-3.1-8b-instruct' OR model IS NULL;