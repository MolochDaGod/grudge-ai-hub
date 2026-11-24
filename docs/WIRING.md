# Wiring other systems to GRUDA Legion

**Canonical brain:** `https://ai.grudge-studio.com`  
**Machine pack:** `GET /v1/context` · `GET /v1/ssot` · `GET /v1/env-recipes` · `GET /v1/skills`  
**Version:** 1.6.13

This is the attach contract. Hands (Forge free-ai, Puter `/api/ai`, fleet `/api/ai` rewrites) call Legion. They do not mint a second public LLM domain.

---

## Load order (every client + every agent)

1. `GET https://ai.grudge-studio.com/v1/context` — brands, ONE TRUTH, env recipes, wiring
2. `GET https://ai.grudge-studio.com/v1/ssot` — URL pointers only
3. `GET https://ai.grudge-studio.com/v1/env-recipes` — npm pins + package.json objects
4. `GET https://ai.grudge-studio.com/v1/skills` — role catalog
5. `https://objectstore.grudge-studio.com/api/v1/fleet-canonical.json` — production hosts
6. Human: `https://info.grudge-studio.com/docs/CANONICAL_CODEX.md`

Do not invent hosts that are missing from those blobs.

---

## Who talks to whom

```
Browser / editor / game
    |
    |- Identity          → id.grudge-studio.com   (JWT mint)
    |- Player bag        → Railway grudge-api     (characters, wallet, island)
    |- Definitions       → objectstore /api/v1    (info may mirror)
    |- Binaries          → assets.grudge-studio.com
    |- Account files     → ai.grudge-studio.com/puter-space   (/grudge-studio)
    |- Studio AI         → ai.grudge-studio.com
            ^
            | service binding or same-origin rewrite
   Forge free-ai · Puter /api/ai/* · fleet /api/ai
```

| System | Attach | Auth | Must not |
|--------|--------|------|----------|
| **Forge** | `POST /api/free-ai/chat?provider=grudge-ai` + `LEGION` binding | Grudge JWT or `GRUDGE_AI_KEY` | Call Gemini/Groq from the SPA |
| **Puter toolkit** | `https://puter.grudge-studio.com/api/ai/*` | Grudge JWT | Treat Puter as product login or bag |
| **Puter space** | `/puter-space` → FS `/grudge-studio` → `*.puter.site` | Grudge ID then Puter user-pays | Desktop-only upload as live deploy |
| **Coder / GRD** | consume `/v1/context` + `/v1/env-recipes` | Puter user `grudachain` in IDE; Grudge ID for games | Use Coder AI Hub worker as Legion chat |
| **Warlords / Open / GRUDOX** | same-origin `/api/ai` rewrite → Legion | Grudge ID JWT | Merge brand SPAs |
| **ObjectStore / info** | JSON defs + docs | public | Player bag |
| **Local agent** | allow-listed `npm` / `node` / `git` / `ollama`; optional local OhMyGame studio (loopback daemon + MCP, token required) | local machine only | Claim browser Monaco can `npm i`; set `DAEMON_HOST=0.0.0.0` or tunnel the daemon; run `bun run dev` without `OHMYGAME_DAEMON_TOKEN`; treat OhMyGame as a second Legion brain, a player-account host, or Grudge branding |

Chat shape (all roles):

```http
POST https://ai.grudge-studio.com/v1/agents/{role}/chat
Authorization: Bearer <grudge_jwt_or_api_key>
Content-Type: application/json

{ "messages": [{ "role": "user", "content": "…" }] }
```

---

## Env recipes (project building)

Default when a user says "build environment / npm / three editor":

| id | When | Pins |
|----|------|------|
| `grudge-play` | Warlords, kits, mixer, Rapier CCT | three **0.185.0** + `@dimforge/rapier3d-compat ^0.19` |
| `grudge-forge-r3f` | Forge scene / character-creator play package | same three + R3F + `@react-three/rapier` |
| `grudge-vibe-mp` | prototype multiplayer only | three ^0.175 + SpacetimeDB — **do not leak** |

npm law:

- OK: `@grudgstudio/core` (defs / icons), `@grudge-studio/*` bake slices
- Forbidden: `npm i grudge-studio` (unscoped 1.0.x is not play path)
- Browser Legion: `nodeRunner === false`. Write the recipe to Puter `/grudge-studio/<slug>` or run `npm i` on the local agent / coder plane.


## Local OhMyGame studio (optional, not a Legion host)

The WhiteTowerAI/ohmygame project (Apache-2.0, beta) is a **local-first AI game studio**: an agent writes the game, generates canvas media, playtests it, and can publish a static web build. It is a good local path for **new** Phaser / Three.js / React Three Fiber prototypes. It is not a replacement for Warlords, not a production host, and not part of `ai.grudge-studio.com`.

Legion Workers cannot reach a laptop's `127.0.0.1`. Do not add an `ohmygame` cloud chat role that pretends to drive the daemon. Point `director`, `dev`, `coder`, and `agentic` at this section instead.

Pin and run from source (Bun 1.4.2+, Node 22.19+):

```bash
git clone --branch main https://github.com/WhiteTowerAI/ohmygame.git
cd ohmygame
bun install --frozen-lockfile
export OHMYGAME_DAEMON_TOKEN  # required on studio machines; do not start tokenless
bun run dev            # web renderer + local daemon (loopback only)
# bun run dev:desktop  # Electron app; skip unless a desktop smoke is requested
```

Default loopback (**do not change the bind**):

| Process | Address | Auth |
|---------|---------|------|
| Fastify daemon | `http://127.0.0.1:43110` (`GET /health` is public) | **Studio policy: set `OHMYGAME_DAEMON_TOKEN` before `bun run dev`.** Upstream is tokenless by default; do not run it that way here. |
| Vite renderer | `http://127.0.0.1:43120` (proxies `/api` to the daemon) | talks to the daemon through the proxy |

Desktop builds force `DAEMON_HOST=127.0.0.1` and pass a process-scoped token on stdin. **Never set `DAEMON_HOST=0.0.0.0`**, never tunnel the daemon, never put it on a `*.grudge-studio.com` host.

Bring-your-own model keys (or Claude Code / Codex / OpenCode). Do not paste Grudge production secrets into this tool. Official release builds may send usage/crash telemetry; source `bun run dev` does not.

MCP (Settings → MCP Server) exposes canvas, media generation, and playtest to other local agents via the upstream `ohmygame-studio` skill.

Studio law:

- Warlords source of truth stays Spawn `@racalvin/grudge-warlords` main.
- Player key is still GrudgeID at `id.grudge-studio.com`. The project's Community / `games.ohmygame.ai` path is not player SSOT.
- Shipped images and meshes are CDN-only: Kiln (unpublished), then Rook, then `assets.grudge-studio.com`. On a CDN miss, show the missing marker. Do not hot-link local or Community URLs.
- Apache-2.0 allows commercial use with attribution when you redistribute or fork the software. Do not use the trademarked OhMyGame name or logo as Grudge branding.

---

## CORS + secrets

- Allow: `*.grudge-studio.com` + production `puter.site` hosts
- Secrets: `wrangler secret put` on **both** `grudge-legion-ai` and `grudge-ai-hub`
- Never `VITE_` provider keys, never keys in Puter HTML

Dual-worker deploy is required:

```bash
npm run deploy          # both workers
npm run deploy:hard     # deploy + D1 skills + smoke
npm run smoke           # must see env_recipes on /v1/context
```

---

## Client snippet

```js
const LEGION = 'https://ai.grudge-studio.com';

export async function attachLegion() {
  const [context, recipes, skills] = await Promise.all([
    fetch(`${LEGION}/v1/context`).then((r) => r.json()),
    fetch(`${LEGION}/v1/env-recipes`).then((r) => r.json()),
    fetch(`${LEGION}/v1/skills`).then((r) => r.json()),
  ]);
  const play = recipes.recipes.find((x) => x.id === 'grudge-play');
  return { context, recipes, skills, play };
}

export async function legionChat(role, content, jwt) {
  const res = await fetch(`${LEGION}/v1/agents/${role}/chat`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages: [{ role: 'user', content }] }),
  });
  return res.json();
}
```

Put this in Forge free-ai, Puter toolkit, and Coder. Do not fork the URL map.
