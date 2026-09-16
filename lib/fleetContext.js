/**
 * Fleet context pack — machine SSOT for Legion agents & fleet clients.
 * Public at GET /v1/context · pointers also in /v1/ssot.
 *
 * One brain: ai.grudge-studio.com. Docs hub: info.grudge-studio.com.
 * Player SSOT: Railway. Definitions: ObjectStore/info. Binaries: R2.
 */

export const CONTEXT_VERSION = '1.6.13';

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
  rest: {
    health: 'GET https://ai.grudge-studio.com/health',
    models: 'GET https://ai.grudge-studio.com/v1/models',
    context: 'GET https://ai.grudge-studio.com/v1/context',
    skills: 'GET https://ai.grudge-studio.com/v1/skills',
    agents: 'GET https://ai.grudge-studio.com/v1/agents',
    games: 'GET https://ai.grudge-studio.com/v1/games',
    chat: 'POST https://ai.grudge-studio.com/v1/chat',
    agent_chat: 'POST https://ai.grudge-studio.com/v1/agents/{role}/chat',
    vision: 'POST https://ai.grudge-studio.com/v1/vision',
    icon_lookup: 'GET https://ai.grudge-studio.com/v1/icons/{ICON-UUID}',
    icon_reviews: 'GET https://ai.grudge-studio.com/v1/icons/reviews',
    icon_review: 'POST https://ai.grudge-studio.com/v1/icons/review',
    icon_review_stream: 'POST https://ai.grudge-studio.com/v1/icons/review/stream',
    embed: 'POST https://ai.grudge-studio.com/v1/embed',
    auth: 'Bearer Grudge JWT or D1 API key on POST chat routes; GET catalog is public',
    free_waterfall: [
      'gemini-byok',
      'groq',
      'workers-ai-binding strong @cf/meta/llama-3.3-70b-instruct-fp8-fast',
      'workers-ai-fast @cf/meta/llama-3.1-8b-instruct-fast',
    ],
    puter_opt_in: 'claude-fable-5-1 / gpt-6-astra — X-Puter-Token User-Pays, never fleet GRUDGE_AI_KEY',
    elevenlabs: 'POST /v1/audio/tts light bark only; bake SFX via danger-ai → R2',
    browser_no_key: 'POST https://grudge-api-production-0d46.up.railway.app/api/ai/chat (gruda-ai-router; Legion first, Puter backup server-side). Do not call puter.ai.chat from the browser.',
  },
  vibe_pack: {
    git: 'https://github.com/MolochDaGod/vibe-coding-starter-pack-3d-multiplayer',
    disk: 'F:/GitHub/vibe-coding-starter-pack-3d-multiplayer',
    coder_template: 'vibe-3d-multiplayer',
    legion_role: 'vibe3d',
    skill: 'vibe-coding-3d-multiplayer',
    stack: 'React 19 + R3F + three ^0.175 + SpacetimeDB 2 — prototype only',
    not: 'Warlords play / loadRaceKit / Carrier rooms / ThreeFlow Vue bundle',
    client_dev: 'cd client && npm install && npm run dev',
  },
  nexus_characters: {
    era: 'nexus',
    body: 'Quaternius Universal Base Superhero Male (CC0, Mixamo-compatible)',
    playground: 'https://ui.grudge-studio.com/quaternius-playground.html?era=nexus',
    trait_store: 'https://ui.grudge-studio.com/trait-store?era=nexus',
    main_panel: 'https://ui.grudge-studio.com/main-panel.html?era=nexus',
    foundry: 'https://character.grudge-studio.com/foundry?era=nexus',
    play: 'https://grudox.grudge-studio.com',
    not: 'Warlords loadRaceKit Toon {race}.glb',
    foot_ik: 'same FootGrounder; Mixamo hips; sampler = Rapier heightAt',
    combat: {
      camera: 'combat-soft-nexus 6.6m / hard 5.9m (Rivals, further than Open 4.6)',
      knockback: 'applyImpulse damp 4.2 + hurt clip fade 0.14 — never teleport',
      targeting: 'LMB select soft lock + assist magnet; RMB hard focus (grudge-combat-targeting)',
      hud: '/game-ui-packs/nexus.json CraftPix 128 + CDN icons',
    },
  },
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
  editors: {
    elite: 'Dev Tool Elite — media preview / convert convenience',
    threeflow_scene: 'https://threeflow.vercel.app/editor — Warlords scene editor (?asset=)',
    threepipe_viewer:
      'https://threeflow.vercel.app/view — fast ThreePipe inspect (threepipe@0.5.1, isolated; NOT a fourth editor)',
    forge: 'https://forge.grudge-studio.com/editor — R3F + Rapier + .gfscene deploy',
    target: 'https://target.grudge.studio — era D1 index + dressing + classify',
    rule: 'Trio is Elite · ThreeFlow scene · Forge. ThreePipe lives at ThreeFlow /view.',
  },
  asset_place: {
    classify: 'POST https://target.grudge.studio/api/v1/classify { filename, era, commit? }',
    d1_era: 'target.grudge.studio D1 era_assets / era_assignments — index only',
    d1_fleet: 'grudge-assets-db asset_registry (deterministic uuid from r2_key)',
    r2: 'bucket grudge-assets → https://assets.grudge-studio.com/<r2_key>',
    r2_put:
      'npx wrangler r2 object put grudge-assets/<r2_key> --file=… --remote  OR Target POST /api/v1/upload + X-Admin-Token',
    keys: {
      play_kit: 'asset-packs/toon-rts-characters/glb/characters/{race}.glb',
      entity: 'models/warlords/entities/{slug}.glb',
      weapon: 'models/weapons/{slug}.glb',
      creature: 'models/creatures/land/{slug}.glb',
      anim: 'anims/baked/{pack}/{slug}.json',
      vfx: 'vfx/skills/{slug}.glb',
    },
    reject: 'fused *_characters.glb as play body · Meshy/capsule heroes · autoScale on SI kits',
    viewer_after: 'https://threeflow.vercel.app/view?asset=<cdn_url>',
  },
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
      'puter Fable/Astra opt-in (X-Puter-Token)',
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

/**
 * Live game attach map — how each production surface reaches Legion.
 * Public at GET /v1/games. Prefer same-origin /api/ai when the host rewrites.
 */
export const GAME_DEPLOYMENTS = [
  {
    id: 'open',
    brand: 'open',
    name: 'Grudge Open',
    host: 'https://open.grudge-studio.com',
    alias: ['https://gameopen.vercel.app'],
    ai_attach: 'same-origin',
    health: 'https://open.grudge-studio.com/api/ai/health',
    chat: 'POST /api/ai/v1/chat',
    agent_chat: 'POST /api/ai/v1/agents/{role}/chat',
    rewrite: 'https://ai.grudge-studio.com',
    legion_role: 'realms',
    auth: 'Grudge JWT Bearer (same keys as /api/characters)',
    player: 'Railway grudge-api-production-0d46',
  },
  {
    id: 'poker',
    brand: 'open',
    name: 'BetUDontBet Poker',
    host: 'https://poker.grudge-studio.com',
    ai_attach: 'same-origin /api/ai/* → Legion',
    health: 'https://poker.grudge-studio.com/api/ai/health',
    chat: 'POST /api/ai/chat',
    rewrite: 'https://ai.grudge-studio.com',
    legion_role: 'general',
    auth: 'GRUDGE_AI_KEY on Worker — cheap Gemini/Groq only (no Puter/Eleven spend)',
    note: 'Table-chat must not send Fable/Astra or fleet key + Puter token',
  },
  {
    id: 'grudox',
    brand: 'grudox',
    name: 'GRUDOX',
    host: 'https://grudox.grudge-studio.com',
    alias: ['https://carrier.grudge-studio.com'],
    ai_attach: 'same-origin',
    health: 'https://grudox.grudge-studio.com/api/ai/health',
    rewrite: 'https://ai.grudge-studio.com',
    legion_role: 'grudox',
    auth: 'Grudge JWT',
    player: 'Railway + Carrier rooms',
  },
  {
    id: 'forge',
    brand: 'forge',
    name: 'Grudge Forge',
    host: 'https://forge.grudge-studio.com',
    ai_attach: 'free-ai-binding',
    health: 'https://forge.grudge-studio.com/api/free-ai/status',
    chat: 'POST /api/free-ai/chat?provider=grudge-ai',
    binding: 'LEGION → grudge-legion-ai',
    legion_role: 'forge',
    auth: 'Grudge JWT or free-ai guest key',
  },
  {
    id: 'warlords',
    brand: 'warlords',
    name: 'Grudge Warlords',
    host: 'https://grudgewarlords.com',
    alias: ['https://client.grudge-studio.com'],
    ai_attach: 'absolute',
    health: 'https://ai.grudge-studio.com/health',
    chat: 'POST https://ai.grudge-studio.com/v1/chat',
    legion_role: 'warlords',
    auth: 'Grudge JWT',
    player: 'Railway + Colyseus',
  },
  {
    id: 'foundry',
    brand: 'foundry',
    name: 'Character Foundry',
    host: 'https://character.grudge-studio.com',
    ai_attach: 'absolute',
    health: 'https://ai.grudge-studio.com/health',
    legion_role: 'grudge6',
    auth: 'Grudge JWT',
    note: 'Create-only 4-slot → play handoff UUID + era',
  },
  {
    id: 'coder',
    brand: 'coder',
    name: 'GrudgeChain Vibe IDE',
    host: 'https://coder.grudge-studio.com',
    alias: ['https://grudachain.grudge-studio.com'],
    ai_attach: 'legion-roles + puter.ai user-pays',
    health: 'https://coder.grudge-studio.com/api/health',
    legion_role: 'coder',
    auth: 'Puter (IDE) · Grudge JWT for fleet games',
    note: 'Coder workers/ai-hub is job events — not Legion chat',
  },
  {
    id: 'puter',
    brand: 'puter',
    name: 'Puter Toolkit',
    host: 'https://puter.grudge-studio.com',
    ai_attach: 'edge /api/ai/*',
    health: 'https://puter.grudge-studio.com/api/health',
    legion_role: 'toolkit',
    auth: 'Grudge JWT',
  },
  {
    id: 'mine_loader',
    brand: 'open',
    name: 'Mine-Loader Realms',
    host: 'https://mineloader.grudge-studio.com',
    alias: ['https://mine.grudge-studio.com', 'https://mine-loader.vercel.app'],
    ai_attach: 'absolute',
    health: 'https://ai.grudge-studio.com/health',
    legion_role: 'realms',
    auth: 'Grudge JWT',
  },
  {
    id: 'ui',
    brand: 'forge',
    name: 'HYDRA UI Editor',
    host: 'https://ui.grudge-studio.com',
    ai_attach: 'absolute /v1/ui/chat',
    health: 'https://ai.grudge-studio.com/health',
    chat: 'POST https://ai.grudge-studio.com/v1/ui/chat',
    legion_role: 'ui',
    auth: 'Grudge JWT',
  },
  {
    id: 'casting',
    brand: 'warlords',
    name: 'Casting Warlords Lab',
    host: 'https://casting.grudge-studio.com',
    alias: ['https://casting.grudge.studio', 'https://casting-abilities-threejs.vercel.app'],
    ai_attach: 'absolute',
    health: 'https://ai.grudge-studio.com/health',
    legion_role: 'warlords',
    auth: 'Grudge JWT',
  },
  {
    id: 'combat_lab',
    brand: 'warlords',
    name: 'Grudge Gladiators',
    host: 'https://grudge-combat.vercel.app',
    ai_attach: 'absolute',
    health: 'https://ai.grudge-studio.com/health',
    legion_role: 'warlords',
    auth: 'Grudge JWT',
  },
  {
    id: 'genesis',
    brand: 'warlords',
    name: 'Warlord Genesis',
    host: 'https://warlord-genesis.vercel.app',
    ai_attach: 'absolute',
    health: 'https://ai.grudge-studio.com/health',
    legion_role: 'warlords',
    auth: 'Grudge JWT',
  },
  {
    id: 'water',
    brand: 'warlords',
    name: 'Water Home Island',
    host: 'https://water.grudge-studio.com',
    ai_attach: 'absolute',
    health: 'https://ai.grudge-studio.com/health',
    legion_role: 'warlords',
    auth: 'Grudge JWT',
  },
];

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
    updated: '2026-08-27',
    audience: ['legion-agents', 'forge', 'puter-toolkit', 'coder', 'fleet-ops'],
    one_truth: ONE_TRUTH,
    brands: BRANDS,
    games: GAME_DEPLOYMENTS,
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
      '4. Player writes → Railway; assets → classify Target → R2 key + gltfProdLoader/loadRaceKit; defs → ObjectStore',
      '4a. Fast mesh inspect → threeflow.vercel.app/view (ThreePipe). Scene → /editor. Deploy → Forge.',
      '4b. Account cloud files → ai.grudge-studio.com/puter-space (not bag SSOT)',
      '5. Chat/roles → Legion REST /v1/chat + /v1/agents/{role}/chat; IDE agentic → Coder/GRUDAIDE',
      '5a. Vibe 3D MP pack → skill vibe-coding-3d-multiplayer; role vibe3d; clone F:/GitHub/vibe-coding-starter-pack-3d-multiplayer',
    ],
    anti_patterns: [
      'Second player DB on Puter KV or D1',
      'Provider API keys in browser / puter.site SPA',
      'Desktop-only Puter upload as live site deploy',
      'Meshy/capsule production heroes',
      'Fourth 3D editor — ThreePipe is ThreeFlow /view only (do not npm-install threepipe into Vue r185)',
      'autoScale-on for Warlords SI kits / fused *_characters.glb as play mesh',
      'Calling Coder AI Hub as Legion chat',
      'SpacetimeDB / vibe Wizard-Paladin FBX as Warlords play or Carrier rooms',
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
- Icons: ICON-* UUID = sha1("grudge-asset:"+r2Key). Catalog info…/api/v1/icon-registry.json. Resolve via resolveIconUrl. Review: POST ai…/v1/icons/review (stream NDJSON, cursor, max 8). Never mint a second icon id. Never SPRT-* for new work.
- AI brain: https://ai.grudge-studio.com (Legion) — skills /v1/skills · context /v1/context
- Puter toolkit: puter.grudge-studio.com (User-Pays cache/projects only — never sole bag)
- Player account cloud files: https://ai.grudge-studio.com/puter-space (Grudge ID sign-in; FS + puter.site deploy — NEVER bag/roster)
- Play meshes: assets.grudge-studio.com GLB via loadRaceKit / gltfProdLoader; D1 = index only
- Fast 3D inspect: https://threeflow.vercel.app/view (ThreePipe). Scene edit: /editor. Deploy: Forge. Not a fourth editor.
- Vibe 3D MP prototype: F:/GitHub/vibe-coding-starter-pack-3d-multiplayer · Legion role vibe3d · Coder template vibe-3d-multiplayer. SpacetimeDB is NOT Carrier/Railway play rooms.
- Feet IK: ObjectStore js/grudge6-foot-ik.js on every play kit. Order beginFrame → mixer.update → apply. Sampler = same heightAt as Rapier CCT. One mixer. Mixamo bake → Bip001 rotation-only. No OrbitControls in combat TPS.
- Nexus characters ≠ Warlords Toon. Nexus = Quaternius Universal Base + Trait Store (ui.grudge-studio.com/quaternius-playground.html?era=nexus) · Foundry ?era=nexus · play GRUDOX. Warlords = loadRaceKit Toon {race}.glb.
- Place assets: POST target.grudge.studio/api/v1/classify → r2_key; binaries wrangler r2 object put grudge-assets/<key> or Target /api/v1/upload (admin). Era D1 is index, not bag.
- GRD/Grudachain agentic IDE: coder.grudge-studio.com (= grudachain.grudge-studio.com) · GRUDAIDE — not a second player SSOT
- Brands: Open · GRUDOX · Forge · Warlords · Foundry · ID — do not merge SPAs
- SI: 1 unit = 1 m; human ~1.8 m. No invented parallel auth or second player DB. autoScale off for Warlords kits.
`.trim();
}
