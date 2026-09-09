/**
 * ONE play system for Warlords — skeleton, kits, clips, API, UUID, scripting.
 * Public at GET /v1/play-contract and embedded in GET /v1/context.play_contract.
 */

export const PLAY_CONTRACT_VERSION = '1.6.13';

export const PLAY_CONTRACT = {
  ok: true,
  version: PLAY_CONTRACT_VERSION,
  era: 'warlords',
  one_system:
    'Bip001 + Toon RTS golden kit + prod/anims + Grudge UUID + Railway player + Legion recipes',
  skeleton: {
    id: 'Bip001',
    mixer: 1,
    hip: 'strip .position on grounded kits — Rapier CCT owns translation',
    fit: 'bone AABB → race heightM (human 1.83) · feet on ground · art-forward +π/2 once',
    clone: 'SkeletonUtils.clone — never scene.clone on SkinnedMesh',
    sockets: {
      main_hand: 'R_hand_container',
      off_hand: 'L_hand_container',
      shield: 'L_shield_container',
    },
  },
  character: {
    era: 'warlords',
    catalog: 'https://objectstore.grudge-studio.com/api/v1/grudge6-characters.json',
    lab: 'https://info.grudge-studio.com/GRUDGE6_Characters.html',
    kit: 'https://assets.grudge-studio.com/asset-packs/toon-rts-characters/glb/characters/{raceId}.glb',
    loader: 'loadRaceKit(THREE, loaders, raceId) source=toonRts',
    equip: 'hide all equippable meshes → show mesh_ids only',
    races: ['human', 'barbarian', 'elf', 'dwarf', 'orc', 'undead'],
  },
  animation: {
    host: 'https://assets.grudge-studio.com/prod/anims/{pack}/{clip}.{glb|json}',
    format: 'Bip001 rotation-first GLB/JSON',
    attack: { focus: 'LMB', anytime: 'Digit1', combos: 'unique per weapon type' },
    never: ['Mixamo FBX on the tick', 'anims/baked as play default', 'second mixer'],
  },
  identity: {
    host: 'https://id.grudge-studio.com',
    login: 'https://id.grudge-studio.com/login',
    jwt_keys: [
      'grudge.open.token',
      'grudge_auth_token',
      'grudge_session_token',
      'grudge.token',
      'sso_token',
    ],
  },
  uuid: {
    module: 'shared/grudgeUUID.ts (Grudge-Builder) — generateGrudgeUUID',
    endpoint: 'https://ai.grudge-studio.com/v1/uuid',
    families: {
      character: 'char_<uuid>',
      account: 'Grudge ID sub — never mint a second account id',
      item: 'SLOT-TIER-ITEMID-TIMESTAMP-COUNTER (Texas time)',
      icon: 'ICON-* via /v1/icons/:uuid',
      asset: 'sha1 in D1 asset_registry (index only)',
    },
  },
  api: {
    brain: 'https://ai.grudge-studio.com',
    player: 'https://grudge-api-production-0d46.up.railway.app',
    definitions: 'https://objectstore.grudge-studio.com/api/v1',
    binaries: 'https://assets.grudge-studio.com',
    docs: 'https://info.grudge-studio.com/docs',
    recipes: 'https://ai.grudge-studio.com/v1/env-recipes',
    play_contract: 'https://ai.grudge-studio.com/v1/play-contract',
  },
  scripting: {
    package: 'grudge-play',
    three: '0.185.0',
    rapier: '^0.19.0',
    init: 'GET /v1/env-recipes → recipes/init-play.sh',
    npm: '@grudgstudio/core for defs — never npm i grudge-studio',
    node: 'browser Legion nodeRunner=false; Puter /grudge-studio or local agent runs npm',
  },
  workers: {
    dual: ['grudge-legion-ai', 'grudge-ai-hub'],
    deploy: 'npm run deploy  # both, same index.js',
    never: [
      'deploy only one Legion worker',
      'grudge-backend/workers/ale as a second brain on ai.grudge-studio.com',
    ],
  },
  never: [
    'models/grudge6/races/*_Characters.glb as play mesh',
    'FBX or metaverse stubs in the browser',
    'D1 or Puter as player bag/roster',
    'Meshy / capsule heroes',
    'whole-body GLB swap for armor',
    'api.grudge-studio.com auth',
  ],
};

const ALPHANUMERIC = '0123456789abcdefghijklmnopqrstuvwxyz';

function toAlphanumeric(num, length = 6) {
  let result = '';
  let n = Math.max(0, num);
  do {
    result = ALPHANUMERIC[n % 36] + result;
    n = Math.floor(n / 36);
  } while (n > 0);
  return result.padStart(length, '0');
}

function texasTimestamp() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const g = (t) => parts.find((p) => p.type === t)?.value ?? '00';
  return `${g('hour')}${g('minute')}${g('month')}${g('day')}${g('year')}`;
}

const SLOT_CODES = {
  sword: 'swrd',
  axe: 'axee',
  hammer: 'hamr',
  mace: 'mace',
  dagger: 'dagr',
  staff: 'staf',
  bow: 'boww',
  spear: 'sper',
  pick: 'pick',
  shield: 'shld',
  head: 'head',
  body: 'ches',
  unarmed: 'item',
  character: 'char',
  item: 'item',
};

export function generateGrudgeUUID(slotOrType, tier, itemId, counter) {
  const slot = (SLOT_CODES[String(slotOrType || 'item').toLowerCase()]
    || String(slotOrType || 'item').toLowerCase().slice(0, 4).padEnd(4, 'x'));
  const tierCode = tier == null || Number.isNaN(Number(tier)) ? 'oo' : `t${Math.max(0, Math.min(8, Number(tier)))}`;
  const item = String(Math.max(0, Number(itemId) || 1)).padStart(4, '0').slice(-4);
  return `${slot}-${tierCode}-${item}-${texasTimestamp()}-${toAlphanumeric(counter ?? 1, 6)}`;
}

export function characterUuid() {
  return `char_${crypto.randomUUID()}`;
}

export async function mintUuid(env, url) {
  const family = (url.searchParams.get('family') || 'item').toLowerCase();
  const slot = url.searchParams.get('slot') || family;
  const tierRaw = url.searchParams.get('tier');
  const tier = tierRaw == null || tierRaw === '' ? null : Number(tierRaw);
  const itemId = Number(url.searchParams.get('item') || '1') || 1;
  let counter = 1;
  if (env?.KV) {
    try {
      const n = Number((await env.KV.get('grudge-uuid-counter')) || '0') + 1;
      await env.KV.put('grudge-uuid-counter', String(n));
      counter = n;
    } catch {
      counter = (Date.now() % 36 ** 6) | 0;
    }
  } else {
    counter = (Date.now() % 36 ** 6) | 0;
  }
  if (family === 'character' || family === 'char') {
    return { ok: true, family: 'character', uuid: characterUuid(), contract: '/v1/play-contract' };
  }
  if (family === 'icon') {
    return { ok: true, family: 'icon', uuid: `ICON-${crypto.randomUUID()}`, lookup: '/v1/icons/:uuid' };
  }
  return {
    ok: true,
    family: 'item',
    uuid: generateGrudgeUUID(slot, tier, itemId, counter),
    format: 'SLOT-TIER-ITEMID-TIMESTAMP-COUNTER',
    contract: '/v1/play-contract',
  };
}
