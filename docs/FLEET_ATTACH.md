# Legion attach map — fleet consumers

**Canonical brain:** `https://ai.grudge-studio.com`  
**Version:** 1.6.13  
**Context pack:** `GET /v1/context` · [AI_CONTEXT_SSOT.md](./AI_CONTEXT_SSOT.md) · [DEPLOY_HARDENING.md](./DEPLOY_HARDENING.md) · [WIRING.md](./WIRING.md)

This doc is the **attach SSOT for clients** (Forge, Puter toolkit, Open, Coder/GRD).  
Forge-side detail: `Grudge-Studio-Forge/docs/AI_FLEET_ATTACH_SSOT.md`.

---

## Who should call Legion

| Client | How | Auth |
|--------|-----|------|
| **Forge free-ai** | `POST /api/free-ai/chat?provider=grudge-ai` → Legion | User JWT or `GRUDGE_AI_KEY` (guest key on Worker OK) |
| **Forge SPA** | Same-origin free-ai (never call providers from browser) | Grudge ID + Puter |
| **Catsot / ALE** | Worker waterfall: Groq → Legion companion → Forge free-ai → optional Railway → xAI | `GROQ_API_KEY` + prefer `GRUDGE_AI_KEY` |
| **Telegram @grudagamebot** | Groq agent loop + tools `forge_free_ai_chat` / `legion_chat` / `hermes_*` | Railway env; Hermes needs API key/cookie |
| **Hermes VPS** | Executor UI + `/api/chat` (auth_required) — not a second brain | Session / `VPS_INTERNAL_KEY` |
| **puter.grudge-studio.com** | Edge `/api/ai/*` or Legion `/v1/*` | Grudge JWT |
| **Other fleet games** | Prefer same-origin `/api/ai` rewrite → Legion | Grudge JWT |

Full join matrix: [FREE_AI_JOIN_SSOT.md](./FREE_AI_JOIN_SSOT.md).

---

## Local OhMyGame (not a Legion consumer)

The WhiteTowerAI/ohmygame project is a third-party local AI game studio (Apache-2.0). It does **not** call `ai.grudge-studio.com` by default, and Legion must **not** be configured to call it.

Use it on a workstation for new Phaser / Three.js / R3F prototypes and canvas media. Audited upstream tip: `d6eac67856583820f2ff2795851fc3787fae02f5` (`WhiteTowerAI/ohmygame` `0.0.0-beta.5.11`).

```bash
git clone https://github.com/WhiteTowerAI/ohmygame.git
cd ohmygame
git checkout d6eac67856583820f2ff2795851fc3787fae02f5
bun install --frozen-lockfile
export OHMYGAME_DAEMON_TOKEN="$(openssl rand -hex 32)"  # generated, non-empty; required on studio machines
# start the daemon in this same shell so it inherits the token; do not start tokenless
bun run dev            # starts the loopback daemon + Vite; the browser UI at :43120 will 401 once a token is set
bun run dev:desktop    # token-required UI path (Electron injects the Bearer token)
```

Guardrails for fleet agents:

- Leave `DAEMON_HOST` unset so the daemon stays on loopback. **Never set `DAEMON_HOST=0.0.0.0`**, and never tunnel or deploy the daemon.
- Generate a non-empty `OHMYGAME_DAEMON_TOKEN` and start the daemon in that same shell with `bun run dev`. Upstream is tokenless by default; studio machines must not run it that way.
- Once the token is set, daemon HTTP calls including `GET /health` need `Authorization: Bearer <token>` and return 401 without it.
- With a token set, the browser UI at `bun run dev` (`http://127.0.0.1:43120`) will 401: the Vite `/api` proxy does not add `Authorization`, and the web renderer only sends `Bearer` inside Electron. Use `bun run dev:desktop` for the token-required UI, or call `http://127.0.0.1:43110` directly with `Authorization: Bearer <token>` (and the same for local MCP). Do not commit a token into `vite.config.ts`; a local, uncommitted proxy header is optional and must stay off git.
- Keep the token on the workstation: never commit it, never put it in a tracked `.env`, and never paste it into chat, PRs, or logs.
- Do not publish Warlords, Foundry, or fleet account flows through `games.ohmygame.ai`.
- Shipped images and meshes are CDN-only: Kiln (unpublished), then Rook, then `assets.grudge-studio.com`. On a CDN miss, show the missing marker.
- Keep Apache-2.0 attribution when redistributing or forking the software. Do not use the trademarked OhMyGame name or logo as Grudge branding.

---

## Agent skills (sub-agents)

Public catalog: `GET https://ai.grudge-studio.com/v1/skills`  
Game attach: `GET https://ai.grudge-studio.com/v1/games`

| Role | Use from Forge / fleet |
|------|----------------|
| `dev` | Default editor code/scene tools |
| `info` | info.grudge-studio.com + ObjectStore codex |
| `agentic` | Multi-agent / GRUDAIDE / orchestration |
| `coder` / `grudachain` | GRD IDE plane (coder = grudachain host) |
| `deploy` | Deploy hardening + smoke |
| `forge` | free-ai attach + R3F editor |
| `toolkit` | PuterJsToolkit / env |
| `puter` | Puter KV/FS law |
| `fleet` | Hosts / deploy topology |
| `warlords` | Gameplay / islands |
| `convert` | Bake → R2 |
| `grudge6` | Character kits |
| `ui` / `ux` | HUD / auth flows |

Chat:

```http
POST /v1/agents/{role}/chat
Authorization: Bearer <grudge_jwt>
Content-Type: application/json

{ "messages": [{ "role": "user", "content": "…" }] }
```

---

## Env recipes + wiring

Machine: `GET https://ai.grudge-studio.com/v1/env-recipes` (also on `/v1/context.env_recipes`)  
Human: [WIRING.md](./WIRING.md)

| Client | Recipe to consume | Role |
|--------|-------------------|------|
| Forge SPA / free-ai | `grudge-forge-r3f` | `forge` |
| Warlords / kits / mixer | `grudge-play` | `director` + `animator` |
| Coder GRUDAIDE default | `grudge-play` | `coder` |
| Vibe proto only | `grudge-vibe-mp` | `vibe3d` — do not leak pins |

Browser Legion cannot `npm install` (`nodeRunner: false`). Write recipe → Puter `/grudge-studio/<slug>` or local agent.

Attach snippet lives in WIRING.md. Do not fork host maps in Forge / Puter / Coder.

---

## Cloudflare AI on Legion only

| Binding / product | Status | Notes |
|-------------------|--------|-------|
| `env.AI` Workers AI | Live | Strong + fast cascade |
| Gemini BYOK | Live | default cheap chat |
| Groq | Live | `GROQ_API_KEY` on both workers |
| Puter Fable 5.1 / Astra 6 | Opt-in | `X-Puter-Token` User-Pays; never fleet key |
| ElevenLabs TTS | Light | `POST /v1/audio/tts` 280 chars; bake SFX via danger-ai → R2 |
| Cohere | **Removed** | Do not restore |
| Embeddings `/v1/embed` | Live | Workers AI BGE (not Cohere) |
| Queue `grudge-ai-events` | Bound | Wire consumers for long jobs |

**Do not** enable Workers AI on Forge free-ai as a second brain — attach via Legion.

---

## Secrets runbook

```bash
cd F:\GitHub\grudge-ai-hub

# Both workers need the same JWT_SECRET as Railway Grudge ID when possible
# npx wrangler secret put JWT_SECRET --name grudge-legion-ai
# npx wrangler secret put JWT_SECRET --name grudge-ai-hub

# Free mid-path (from console.groq.com)
# echo gsk_... | npx wrangler secret put GROQ_API_KEY --name grudge-legion-ai
# echo gsk_... | npx wrangler secret put GROQ_API_KEY --name grudge-ai-hub

# Gemini BYOK already commonly set
# npx wrangler secret put GEMINI_API_KEY --name grudge-legion-ai
```

Smoke:

```bash
curl -s https://ai.grudge-studio.com/health
# expect: version 1.6.13, env_recipes on /v1/context, /v1/env-recipes lists grudge-play
```

---

## Deploy

```bash
npm run deploy          # legion-ai + domain hub
npm run deploy:hard     # deploy + D1 skills + smoke
npm run deploy:api      # path worker only
npm run deploy:domain   # UI host only
npm run db:skills:all   # re-seed puter + context/agentic roles
npm run smoke           # post-deploy URL checks
```

---

## Account / Puter (do not store on Legion)

Legion is **stateless LLM + D1 agent roles/API keys**. Player bag lives on **Railway**.

| Data | Where |
|------|--------|
| JWT verify | Legion `JWT_SECRET` |
| Bag / characters | Railway |
| Puter KV mirrors | User Puter only (Forge/Toolkit) |

See Forge `docs/ACCOUNT_PUTER_ENGINE_SSOT.md`.

## Step checklist (shared with Forge)

- [x] Skills + waterfall 1.5.0 deployed  
- [x] free-ai proxies `provider=grudge-ai`  
- [x] Service binding free-ai → legion-ai (Forge free-ai 1.5.1)  
- [x] Account/Puter engine docs  
- [x] Forge SPA deploy (GHA)  
- [x] `/v1/context` + info/GRD/agentic skills 1.6.0  
- [x] Legion `GROQ_API_KEY` (both workers)  
- [x] free-ai + puter `GROQ_API_KEY`  
- [x] `POLY_PIZZA_API_KEY` on Legion / free-ai / puter (edge only)  
- [x] env_recipes + WIRING.md 1.6.13  
- [ ] Dual-worker deploy of 1.6.13 (`index.js` `/v1/env-recipes` route)  
- [ ] free-ai `GRUDGE_AI_KEY` for guests  
- [ ] Agent jobs invoke Legion roles
