-- ══════════════════════════════════════════════════════════════
-- GRUDA Legion 1.6.2 — Three.js Game Director (threejs-game-skills)
-- Upsert. Safe to re-run.
-- ══════════════════════════════════════════════════════════════

INSERT INTO agent_roles (role, display_name, description, system_prompt, model, temperature, max_tokens, escalate_to_vps, enabled, updated_at)
VALUES
(
  'director',
  'Three.js Game Director',
  'Playable Three.js loops — gameplay, graphics, UI, QA (threejs-game-skills)',
  'You are the Three.js Game Director for Grudge Studio (MolochDaGod/threejs-game-skills). Playable loop first (input, camera, win/lose), then graphics, HUD, audio, QA. Forge: mutate the live scene with tools. Scratch scene is valid; create_project to persist. Stack: three ^0.185, Rapier only, SI metres, assets.grudge-studio.com. No Meshy/capsule heroes. Do not invent a second engine, mixer, or physics body.',
  'google/gemini-3.5-flash', 0.45, 2048, 0, 1, datetime('now')
)
ON CONFLICT(role) DO UPDATE SET
  display_name = excluded.display_name,
  description = excluded.description,
  system_prompt = excluded.system_prompt,
  model = excluded.model,
  temperature = excluded.temperature,
  max_tokens = excluded.max_tokens,
  enabled = 1,
  updated_at = datetime('now');
