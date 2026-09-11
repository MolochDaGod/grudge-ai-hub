-- ══════════════════════════════════════════════════════════════
-- GRUDA Legion 1.6.9 — overlay stale D1 catalog onto code SSOT
-- Safe to re-run. Chat still prefers lib/agentSkills.js.
-- ══════════════════════════════════════════════════════════════

UPDATE agent_roles SET
  display_name = 'Art Director',
  description = '3D/UI art + ICON-* PNG review; production meshes not Meshy heroes',
  system_prompt = 'You are art director for Grudge Studio. Production heroes = grudge6 / 30characters.glb + CDN R2 — never Meshy/capsule as shipped heroes. Icons: ICON-* UUIDs. Inspect at threeflow.vercel.app/view. Classify via target.grudge.studio. SI meters.',
  model = 'google/gemini-3.5-flash',
  escalate_to_vps = 0,
  enabled = 1,
  updated_at = datetime('now')
WHERE role = 'art';

UPDATE agent_roles SET
  display_name = 'Animator Worker',
  description = 'One AnimationMixer, Bip001 packs, NL → clip ops — never a second mixer',
  system_prompt = 'You are the Grudge Animator worker. One AnimationMixer per body. Bip001 packs. Bones-only rematch; strip position tracks on grounded kits. Mixamo tracks stay off Bip001 play. Feet IK after mixer.update on the same heightAt as Rapier.',
  model = 'google/gemini-3.5-flash',
  escalate_to_vps = 0,
  enabled = 1,
  updated_at = datetime('now')
WHERE role = 'animator';

UPDATE agent_roles SET
  display_name = 'Three.js Runtime',
  description = 'Three.js scene, loader, performance',
  system_prompt = 'You are Three.js r185+ agent for Grudge fleet. Packages: three, rapier, three-mesh-bvh, three-pathfinding. No second AnimationMixer library. Color management, dispose, SI units. Not Babylon as play engine.',
  model = 'google/gemini-3.5-flash',
  escalate_to_vps = 0,
  enabled = 1,
  updated_at = datetime('now')
WHERE role = '3d';

UPDATE agent_roles SET
  display_name = 'Asset Library',
  description = 'R2 CDN binaries + D1 index + ICON-* — never player bag',
  system_prompt = 'You are the Grudge asset library agent. Binaries assets.grudge-studio.com. D1 is index only. Play mesh loadRaceKit Toon {race}.glb. Never Meshy/capsule heroes, never a second bag DB.',
  model = 'google/gemini-3.5-flash',
  escalate_to_vps = 0,
  enabled = 1,
  updated_at = datetime('now')
WHERE role = 'assets';

UPDATE agent_roles SET
  display_name = 'API / Backend',
  description = 'Railway APIs, Workers, CORS',
  model = 'google/gemini-3.5-flash',
  escalate_to_vps = 0,
  enabled = 1,
  updated_at = datetime('now')
WHERE role = 'api';

UPDATE agent_roles SET
  display_name = 'General Assistant',
  description = 'General-purpose Grudge Studio game dev chat',
  model = 'google/gemini-3.5-flash',
  escalate_to_vps = 0,
  enabled = 1,
  updated_at = datetime('now')
WHERE role = 'general';
