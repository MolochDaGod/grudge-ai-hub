/**
 * Canon grounding for world-facing Legion roles (retrieval, not fine-tuning).
 *
 * Reads the published lore pack from ObjectStore (api/v1/lore-canon.json, listed in
 * api/v1/canon-manifest.v1.json) and turns it into a short brief appended to the role's
 * system prompt. Only status "canon" entries are stated as fact; "draft" entries are marked;
 * "held" and "unratified" entries are left out. Player facts are never in the brief: they
 * belong to grudge-api, keyed by grudgeId.
 *
 * Fail soft: if the pack cannot be read, the brief tells the model not to assert world facts.
 */

export const CANON_ROLES = new Set(['lore', 'faction', 'warlords', 'companion', 'mission', 'fantasy', 'realms']);

const DEFAULT_LORE_URL = 'https://objectstore.grudge-studio.com/api/v1/lore-canon.json';
const CACHE_SECONDS = 600;
const MAX_BRIEF_CHARS = 9000;

let memo = { at: 0, url: '', brief: null, version: null };

const RULES = [
  'Canon rules:',
  '- State world facts only from the canon below. If something is not there, say it is not in canon yet.',
  '- Never invent gods, factions, races or classes. Factions: crusade, legion, fabled. Classes are the eight listed.',
  '- "Legion" in the world is the faction of orcs and undead under Madra. The AI service is a different thing.',
  '- Never use World of Warcraft spell, skill, character or place names.',
  '- Do not describe or link images. Art comes only from the studio CDN by catalog key.',
  '- Entries marked (draft) are not final: say so when you use one.',
  '- Anything about a player (characters, bag, gold, progress) comes from the player API, not from you.',
];

function clip(s, n) {
  s = String(s || '').replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

export function buildBrief(pack) {
  const out = [...RULES, '', `Canon pack ${pack.id || 'lore-canon'} ${pack.version || ''}:`];
  if (pack.world?.summary) out.push(`World: ${clip(pack.world.summary, 500)}`);
  for (const g of pack.gods || []) {
    if (g.status !== 'canon') continue;
    out.push(`God ${g.name} [${g.uuid}]: patron of ${g.patronOf || 'none'}; ${clip((g.domain || []).join(', '), 80)}. ${clip(g.role, 140)}`);
  }
  for (const f of pack.factions || []) out.push(`Faction ${f.name} (${f.slug}) [${f.uuid}]: patron ${f.patron}; races ${(f.races || []).join(', ')}. ${clip(f.summary, 160)}`);
  for (const r of pack.races || []) out.push(`Race ${r.name} (${r.slug}) [${r.uuid}]: ${r.faction}; ${clip(r.summary, 120)}`);
  if (pack.classes?.length) out.push(`Classes: ${pack.classes.map((c) => `${c.name} (${c.slug})`).join(', ')}`);
  for (const h of pack.heroes || []) {
    if (h.status !== 'canon' && h.status !== 'draft') continue;
    const tag = h.status === 'draft' ? ' (draft)' : '';
    out.push(`Hero ${h.name} [${h.uuid}]${tag}: ${h.race} ${h.class}, ${h.faction}. ${clip(h.summary, 160)}`);
  }
  let text = out.join('\n');
  if (text.length > MAX_BRIEF_CHARS) text = text.slice(0, MAX_BRIEF_CHARS - 1) + '…';
  return text;
}

/** Returns { brief, version, ok }. Never throws. */
export async function getCanonBrief(env) {
  const url = (env.CANON_LORE_URL || DEFAULT_LORE_URL).trim();
  const now = Date.now();
  if (memo.brief && memo.url === url && now - memo.at < CACHE_SECONDS * 1000) {
    return { brief: memo.brief, version: memo.version, ok: true };
  }
  try {
    const res = await fetch(url, { cf: { cacheTtl: CACHE_SECONDS, cacheEverything: true }, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`canon ${res.status}`);
    const pack = await res.json();
    const brief = buildBrief(pack);
    memo = { at: now, url, brief, version: pack.version || null };
    return { brief, version: memo.version, ok: true };
  } catch {
    return {
      ok: false,
      version: null,
      brief: [...RULES, '', 'Canon pack unavailable right now. Do not assert world facts; offer to help once canon loads.'].join('\n'),
    };
  }
}

/** Append the canon brief to a role config's system prompt when the role is world-facing. */
export async function groundRole(env, role, roleConfig) {
  if (!CANON_ROLES.has(role) || env.CANON_GROUNDING === '0') return { roleConfig, canon: null };
  const c = await getCanonBrief(env);
  return {
    roleConfig: { ...roleConfig, system_prompt: `${roleConfig.system_prompt || ''}\n\n${c.brief}` },
    canon: { ok: c.ok, version: c.version },
  };
}
