/**
 * Env + npm recipes — machine SSOT for project building.
 * Public at GET /v1/env-recipes and embedded in GET /v1/context.env_recipes.
 *
 * Play path: Three 0.185 + Rapier ^0.19. Puter is cloud, not the tick.
 * Vibe pack is prototype-only and must not leak those pins onto Forge / Warlords.
 */

export const NPM_LAW = {
  play_three: '0.185.0',
  play_rapier: '^0.19.0',
  official: [
    '@grudgstudio/core — ObjectStore / icons / Puter client for defs',
    '@grudge-studio/* — bake / character / quality slices when published',
  ],
  forbidden: [
    'npm i grudge-studio — unscoped 1.0.x is NOT play path',
    'second physics world (Cannon, Havok, ammo) on a Rapier play package',
    'Mixamo FBX as a runtime clip — convert to GLB first',
    'models/grudge6/races/*_Characters.glb as play mesh — bake-compare leftover',
    'FBX or models/grudge6/metaverse in the browser',
    'provider API keys in VITE_* or puter.site HTML',
  ],
  node_delivery: {
    browser_legion: 'nodeRunner is false on the Worker — Monaco cannot npm install',
    local_agent: 'allow-listed npm/node/git/ollama only when local agent health.nodeRunner === true',
    puter: 'account disk is /grudge-studio via ai.grudge-studio.com/puter-space then *.puter.site',
    coder: 'GRUDAIDE / coder.grudge-studio.com consumes the same env_recipes blob',
  },
};

export const ENV_RECIPES = [
  {
    id: 'grudge-play',
    title: 'Fleet play package',
    prototype: false,
    legion_roles: ['director', 'animator', 'dev', '3d'],
    disk: '/grudge-studio/<slug>',
    puter_space: 'https://ai.grudge-studio.com/puter-space',
    package: {
      name: 'grudge-play',
      private: true,
      type: 'module',
      scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' },
      dependencies: {
        three: '0.185.0',
        '@dimforge/rapier3d-compat': '^0.19.0',
      },
      devDependencies: { vite: '^6.2.0' },
    },
    rules: [
      'Play kit is GOLDEN Toon RTS: asset-packs/toon-rts-characters/glb/characters/{raceId}.glb',
      'Never load models/grudge6 bake kits, FBX, or metaverse stubs at runtime',
      'One AnimationMixer per character root',
      'GLB/GLTF runtime clips — no Mixamo FBX on the tick',
      'Rapier CCT owns translation; clips in-place unless marked root-motion',
      'Puter.js is project + asset cloud, not the animation runtime',
    ],
  },
  {
    id: 'grudge-forge-r3f',
    title: 'Forge / character-creator R3F package',
    prototype: false,
    legion_roles: ['forge', 'director', 'coder'],
    host: 'https://forge.grudge-studio.com',
    package: {
      name: 'grudge-forge-r3f',
      private: true,
      type: 'module',
      scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' },
      dependencies: {
        react: '^19.0.0',
        'react-dom': '^19.0.0',
        three: '0.185.0',
        '@react-three/fiber': '^9.0.0',
        '@react-three/drei': '^10.0.0',
        '@react-three/rapier': '^1.5.0',
        '@dimforge/rapier3d-compat': '^0.19.0',
      },
      devDependencies: {
        '@vitejs/plugin-react': '^4.3.4',
        vite: '^6.2.0',
      },
    },
    rules: [
      'Pin three 0.185 to match Forge production',
      'R3F allowed in Forge / character-creator play packages',
      'Vanilla engines keep React as HUD only',
      'Do not stand up a second physics world',
      'Scene save: local first, Puter when signed in',
    ],
  },
  {
    id: 'grudge-vibe-mp',
    title: 'Vibe 3D multiplayer — PROTOTYPE ONLY',
    prototype: true,
    legion_roles: ['vibe3d', 'coder'],
    git: 'https://github.com/MolochDaGod/vibe-coding-starter-pack-3d-multiplayer',
    coder_template: 'vibe-3d-multiplayer',
    stack: 'React 19 + R3F + three ^0.175 + SpacetimeDB 2',
    not: ['Warlords play', 'loadRaceKit', 'Carrier rooms', 'ThreeFlow Vue bundle'],
    rules: [
      'Keep this pin set off the fleet play path',
      'Do not copy three ^0.175 into Forge or character kits',
    ],
  },
];

/** How other systems attach to Legion without inventing a second brain. */
export const WIRING = {
  law: 'One public brain: ai.grudge-studio.com. Hands attach; they do not mint a second LLM domain.',
  load_order: [
    'GET https://ai.grudge-studio.com/v1/context',
    'GET https://ai.grudge-studio.com/v1/ssot',
    'GET https://ai.grudge-studio.com/v1/env-recipes',
    'GET https://ai.grudge-studio.com/v1/skills',
    'https://objectstore.grudge-studio.com/api/v1/fleet-canonical.json',
  ],
  attach: [
    {
      system: 'forge',
      host: 'https://forge.grudge-studio.com',
      path: '/api/free-ai/*',
      provider: 'grudge-ai',
      binding: 'LEGION → grudge-legion-ai',
      note: 'Same-origin hands only. SPA never calls Gemini/Groq/xAI directly.',
    },
    {
      system: 'puter_toolkit',
      host: 'https://puter.grudge-studio.com',
      path: '/api/ai/*',
      auth: 'Grudge JWT',
      note: 'User-pays puter.ai is IDE/cache. Studio roles stay on Legion.',
    },
    {
      system: 'puter_space',
      host: 'https://ai.grudge-studio.com/puter-space',
      disk: '/grudge-studio',
      deploy: '*.puter.site via hosting.list() Sites root',
      note: 'Account cloud files. Never bag/roster/wallet.',
    },
    {
      system: 'coder_grd',
      hosts: [
        'https://coder.grudge-studio.com',
        'https://grudachain.grudge-studio.com',
      ],
      consume: 'env_recipes + /v1/context',
      note: 'GRUDAIDE pipelines. Coder workers/ai-hub = job events only, not Legion chat.',
    },
    {
      system: 'fleet_games',
      hosts: [
        'https://grudgewarlords.com',
        'https://open.grudge-studio.com',
        'https://grudox.grudge-studio.com',
      ],
      path: 'same-origin /api/ai rewrite → Legion',
      auth: 'Grudge ID JWT (id.grudge-studio.com)',
      player: 'Railway grudge-api-production-0d46',
    },
    {
      system: 'objectstore_info',
      hosts: [
        'https://objectstore.grudge-studio.com',
        'https://info.grudge-studio.com',
      ],
      role: 'definitions + docs. Not player SSOT. Not binaries.',
    },
    {
      system: 'assets_cdn',
      host: 'https://assets.grudge-studio.com',
      loader: 'loadRaceKit / gltfProdLoader (r185 Draco+Meshopt+KTX2)',
      index: 'D1 asset_registry search only',
    },
    {
      system: 'identity',
      host: 'https://id.grudge-studio.com',
      login: 'https://id.grudge-studio.com/login',
      tokens: [
        'grudge.open.token',
        'grudge_auth_token',
        'grudge_session_token',
        'grudge.token',
        'sso_token',
      ],
      never: ['api.grudge-studio.com', 'Puter as product login'],
    },
  ],
  chat: {
    method: 'POST',
    url: 'https://ai.grudge-studio.com/v1/agents/{role}/chat',
    headers: {
      Authorization: 'Bearer <grudge_jwt_or_api_key>',
      'Content-Type': 'application/json',
    },
    body: { messages: [{ role: 'user', content: '…' }] },
  },
  cors: ['*.grudge-studio.com', 'production puter.site hosts'],
  secrets: 'wrangler secret put only — never commit, never VITE_ provider keys',
};

export function listEnvRecipes() {
  return {
    ok: true,
    npm_law: NPM_LAW,
    recipes: ENV_RECIPES,
    wiring: WIRING,
  };
}

export function recipeById(id) {
  return ENV_RECIPES.find((r) => r.id === id) || null;
}
