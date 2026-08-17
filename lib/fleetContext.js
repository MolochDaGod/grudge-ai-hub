/**
 * Fleet context pack — machine SSOT for Legion agents & fleet clients.
 * Public at GET /v1/context · pointers also in /v1/ssot.
 *
 * One brain: ai.grudge-studio.com. Docs hub: info.grudge-studio.com.
 * Player SSOT: Railway. Definitions: ObjectStore/info. Binaries: R2.
 */

export const CONTEXT_VERSION = '1.6.1';

/** Brands must not collapse into one SPA. */
export const BRANDS = {
  open: {
    name: 'Grudge Open',
    host: 'https://open.grudge-studio.com',
    metaphor: 'Steam-like library',
  },
  grudox: {
    name: 'GRUDOX',
    host: 'https://grudox.grudge-studio.com',
    metaphor: 'Minecraft-like launcher / arcade',
  },
  forge: {
    name: 'Grudge Forge',
    host: 'https://forge.grudge-studio.com',
    metaphor: 'Unity-like map/scene editor',
  },
  warlords: {
    name: 'Grudge Warlords',
    host: 'https://grudgewarlords.com',
    metaphor: 'Warlords era play',
  },
  foundry: {
    name: 'Character Foundry',
    host: 'https://character.grudge-studio.com',
    metaphor: 'Create / 4-slot heroes',
  },
  id: {
    name: 'Grudge ID',
    host: 'https://id.grudge-studio.com',
    metaphor: 'SSO / JWT',
  },
  legion: {
    name: 'GRUDA Legion AI',
    host: 'https://ai.grudge-studio.com',
    metaphor: 'Fleet AI brain + agent skills',
  },
  puter: {
    name: 'Puter Toolkit',
    host: 'https://puter.grudge-studio.com',
    metaphor: 'User-Pays bridge / projects / fleet hub',
  },
  coder: {
    name: 'GrudgeChain Vibe IDE (GRD)',
    host: 'https://coder.grudge-studio.com',
    alias: 'https://grudachain.grudge-studio.com',
    metaphor: 'Agentic IDE + deploy pipelines',
  },
  info: {
    name: 'ObjectStore Info / Docs',
    host: 'https://info.grudge-studio.com',
    metaphor: 'Human + machine docs & definitions mirror',
  },
};

/**
 * ONE TRUTH stack — agents must load this before inventing hosts.
 */
export const ONE_TRUTH = {
  identity: 'https://id.grudge-studio.com',
  identity_login: 'https://id.grudge-studio.com/login',
  player_state: 'https://grudge-api-production-0d46.up.railway.app',
  player_note:
    'Railway Postgres — characters, accounts, bag, island, wallet, ships. NOT D1. NOT Puter sole.',
  definitions: 'https://objectstore.grudge-studio.com/api/v1',
  definitions_mirror: 'https://info.grudge-studio.com',
  binaries: 'https://assets.grudge-studio.com',
  asset_index: 'D1 asset_registry (index only — never player SSOT)',
  docs: 'https://info.grudge-studio.com/docs',
  docs_codex: 'https://info.grudge-studio.com/docs/CANONICAL_CODEX.md',
  fleet_canonical:
    'https://objectstore.grudge-studio.com/api/v1/fleet-canonical.json',
  docs_catalog:
    'https://objectstore.grudge-studio.com/api/v1/docs-catalog.json',
  warlords_production:
    'https://objectstore.grudge-studio.com/api/v1/warlords-production.json',
  ai: 'https://ai.grudge-studio.com',
  ai_skills: 'https://ai.grudge-studio.com/v1/skills',
  ai_context: 'https://ai.grudge-studio.com/v1/context',
  ai_ssot: 'https://ai.grudge-studio.com/v1/ssot',
  puter: 'https://puter.grudge-studio.com',
  /** Player account User-Pays FS + puter.site deploy. Sign in with Grudge ID. Never bag/roster. */
  puter_space: 'https://ai.grudge-studio.com/puter-space',
  token_keys: [
    'grudge.open.token',
    'grudge_auth_token',
    'grudge_session_token',
    'grudge.token',
    'sso_token',
  ],
  /** How deployed games/editors load binaries from R2 via assets.grudge-studio.com */
  asset_serve: {
    host: 'https://assets.grudge-studio.com',
    index: 'D1 asset_registry (search only)',
    play_mesh: 'Toon RTS GLB via loadRaceKit / gltfProdLoader (r185 Draco+Meshopt+KTX2)',
    not_play_default: 'raw FBX, Meshy, capsule, split gltf without bin',
    mime: {
      glb: 'model/gltf-binary',
      gltf: 'model/gltf+json',
      png: 'image/png',
      webp: 'image/webp',
      jpg: 'image/jpeg',
      js: 'application/javascript',
      wasm: 'application/wasm',
      mp3: 'audio/mpeg',
      mp4: 'video/mp4',
      fbx: 'application/octet-stream',
    },
  },
  si: '1 unit = 1 m; human ~1.8 m; orc ~2.0 m — never 100× giants',
  deprecated: [
    'https://api.grudge-studio.com',
    'molochdagod.github.io as production sole',
    'grudge-objectstore.pages.dev as sole defs',
    'localStorage-only production characters',
    'Meshy / generic capsule as shipped heroes',
  ],
};

/**
 * AI deployable systems — which plane to call for which job.
 * Do not merge Legion with Coder AI Hub worker.
 */
export const AI_DEPLOYABLE = {
  legion: {
    id: 'legion',
    host: 'https://ai.grudge-studio.com',
    repo: 'F:/GitHub/grudge-ai-hub',
    workers: ['grudge-legion-ai', 'grudge-ai-hub'],
    role: 'Fleet brain — chat, agent roles, vision, embed, models, context pack',
    auth: 'Grudge JWT (JWT_SECRET) or admin/API key',
    waterfall: [
      'gemini-byok',
      'groq (if GROQ_API_KEY)',
      'workers-ai-binding strong→fast',
      'workers-ai-rest optional',
    ],
    deploy: 'npm run deploy  # both workers',
    smoke: [
      'GET /health',
      'GET /v1/skills',
      'GET /v1/context',
      'GET /v1/ssot',
    ],
  },
  forge_free_ai: {
    id: 'forge-free-ai',
    host: 'https://forge.grudge-studio.com/api/free-ai/',
    worker: 'grudge-forge-free-ai',
    role: 'Forge same-origin hands — proxy Legion + fleet Groq/Together',
    binding: 'LEGION → grudge-legion-ai',
    deploy: 'cd workers/forge-free-ai && npx wrangler deploy',
  },
  puter_edge: {
    id: 'puter-edge',
    host: 'https://puter.grudge-studio.com',
    worker: 'puter-grudge-toolkit',
    role: 'Toolkit SPA + /api/ai/* bridge to Legion; Free AI orchestrator',
    deploy: 'npm run deploy:bridge',
  },
  coder_agentic: {
    id: 'coder-agentic-grd',
    label: 'GRD / Grudachain agentic IDE',
    hosts: [
      'https://coder.grudge-studio.com',
      'https://grudachain.grudge-studio.com',
    ],
    repo: 'F:/GitHub/GrudachainCode',
    role: 'Vibe IDE — GRUDAIDE agentic layer, Creator/Deployer/Coder pipelines, Puter FS/AI',
    public_deploy: 'CF Pages grudgechain-vibe-ide + api.vibe gateway + vibe-backend Worker',
    self_host: 'Docker Compose / Dev Tool — PTY + local FS',
    fleet_ai: 'Prefer ai.grudge-studio.com for studio roles; puter.ai for user-pays in IDE',
    coder_ai_hub:
      'workers/ai-hub in GrudachainCode — event/job ingest only; NOT Legion chat',
    admin_puter_user: 'grudachain',
  },
  info_objectstore: {
    id: 'info-objectstore',
    hosts: [
      'https://info.grudge-studio.com',
      'https://objectstore.grudge-studio.com',
    ],
    repo: 'F:/GitHub/ObjectStore',
    role: 'Definitions JSON, docs hub, grudge6 labs, UUID browsers — not player bag',
    machine: [
      '/api/v1/fleet-canonical.json',
      '/api/v1/docs-catalog.json',
      '/api/v1/warlords-production.json',
      '/api/v1/*.json game defs',
    ],
    human: 'https://info.grudge-studio.com/docs',
  },
};

/** Agentic stack map (GRUDAIDE + Legion roles + Forge orchestrator). */
export const AGENTIC = {
  law: 'Agentic means multi-step agents with tools/skills — still bound to ONE TRUTH hosts.',
  layers: [
    {
      name: 'Legion agent roles',
      surface: 'POST /v1/agents/{role}/chat',
      catalog: 'GET /v1/skills',
    },
    {
      name: 'GRUDAIDE (Coder)',
      surface: 'coder.grudge-studio.com',
      modules: [
        'featureFlags',
        'mcp',
        'codebaseIndex',
        'contextBuilder',
        'agentOrchestrator',
        'specSystem',
        'Director runtime',
      ],
    },
    {
      name: 'Coder pipeline specialties',
      roles: ['code', 'deploy', 'create', 'organize', 'gamedev', 'general'],
    },
    {
      name: 'Forge Auto orchestrator',
      surface: 'forge free-ai + SPA',
      order: [
        'grudge-ai (Legion)',
        'fleet groq/together',
        'puter user-pays',
        'BYOK',
        'ollama',
      ],
    },
  ],
};

/** Hardened deploy checklist (all AI-related hosts). */
export const DEPLOY_HARDENING = {
  principles: [
    'Deploy intentional single-intent changes; name the live URL smoked',
    'Never commit secrets; wrangler secret put only',
    'Dual-worker Legion: deploy both grudge-legion-ai AND grudge-ai-hub',
    'Forge free-ai uses LEGION service binding — not a second public brain domain',
    'Puter sites: upload to Sites/<sub>/deployment via hosting.list() — not Desktop-only',
    'Player mutations only after Railway OK; Puter mirror is cache',
    'CORS: *.grudge-studio.com + production puter.site where needed',
    'Health JSON on every edge service with version + providers',
  ],
  pre_deploy: [
    'git status clean of .env secrets',
    'version bump in package + agentSkills HUB_VERSION',
    'wrangler dry-run or build:client success',
  ],
  post_deploy_smoke: [
    'https://ai.grudge-studio.com/health',
    'https://ai.grudge-studio.com/v1/context',
    'https://ai.grudge-studio.com/v1/skills',
    'https://ai.grudge-studio.com/puter-space',
    'https://forge.grudge-studio.com/api/free-ai/status',
    'https://puter.grudge-studio.com/api/health',
    'https://info.grudge-studio.com/docs',
    'https://coder.grudge-studio.com/',
    'https://objectstore.grudge-studio.com/api/v1/fleet-canonical.json',
  ],
};

export function buildContextPack() {
  return {
    ok: true,
    version: CONTEXT_VERSION,
    title: 'Grudge Studio AI Context Pack',
    updated: '2026-08-17',
    audience: ['legion-agents', 'forge', 'puter-toolkit', 'coder', 'fleet-ops'],
    one_truth: ONE_TRUTH,
    brands: BRANDS,
    ai_deployable: AI_DEPLOYABLE,
    agentic: AGENTIC,
    deploy_hardening: DEPLOY_HARDENING,
    grd: {
      name: 'GRD / Grudachain',
      meaning:
        'GrudgeChain Vibe IDE plane — agentic create/deploy/code under coder + grudachain hosts',
      primary: 'https://coder.grudge-studio.com',
      alias: 'https://grudachain.grudge-studio.com',
      admin_identity: 'Puter user grudachain (IDE admin) — fleet games still use Grudge ID JWT',
      related_ai: [
        'Legion for studio roles',
        'puter.ai for user-pays IDE chat',
        'Coder workers/ai-hub for job events only',
      ],
    },
    info: {
      host: 'https://info.grudge-studio.com',
      docs: 'https://info.grudge-studio.com/docs',
      codex: ONE_TRUTH.docs_codex,
      note: 'Redirects / → /docs. Definitions mirror ObjectStore; use objectstore host for /api/v1/*.json when info mirror 404s.',
    },
    load_order_for_agents: [
      '1. GET /v1/context (this pack) or /v1/ssot',
      '2. Prefer info docs + fleet-canonical for production truth',
      '3. Pick brand host — never merge Open/GRUDOX/Forge/Warlords',
      '4. Player writes → Railway; assets → R2 + gltfProdLoader/loadRaceKit; defs → ObjectStore',
      '4b. Account cloud files → ai.grudge-studio.com/puter-space (not bag SSOT)',
      '5. Chat/roles → Legion; IDE agentic → Coder/GRUDAIDE',
    ],
    anti_patterns: [
      'Second player DB on Puter KV or D1',
      'Provider API keys in browser / puter.site SPA',
      'Desktop-only Puter upload as live site deploy',
      'Meshy/capsule production heroes',
      'Calling Coder AI Hub as Legion chat',
      'Inventing parallel auth hosts',
    ],
  };
}

/** Compact system preamble injected into agent skills. */
export function fleetLawPrompt() {
  return `
FLEET ONE TRUTH (load https://ai.grudge-studio.com/v1/context for full pack):
- Identity: https://id.grudge-studio.com (JWT keys: grudge_auth_token, grudge_session_token, grudge.token, sso_token)
- Player bag/characters/wallet: Railway grudge-api-production-0d46
- Definitions: objectstore.grudge-studio.com/api/v1 · human docs: info.grudge-studio.com/docs · codex: /docs/CANONICAL_CODEX.md
- Binaries: assets.grudge-studio.com · D1 = asset index only
- AI brain: https://ai.grudge-studio.com (Legion) — skills /v1/skills · context /v1/context
- Puter toolkit: puter.grudge-studio.com (User-Pays cache/projects only — never sole bag)
- Player account cloud files: https://ai.grudge-studio.com/puter-space (Grudge ID sign-in; FS + puter.site deploy — NEVER bag/roster)
- Play meshes: assets.grudge-studio.com GLB via loadRaceKit / gltfProdLoader; D1 = index only
- GRD/Grudachain agentic IDE: coder.grudge-studio.com (= grudachain.grudge-studio.com) · GRUDAIDE — not a second player SSOT
- Brands: Open · GRUDOX · Forge · Warlords · Foundry · ID — do not merge SPAs
- SI: 1 unit = 1 m; human ~1.8 m. No invented parallel auth or second player DB.
`.trim();
}
