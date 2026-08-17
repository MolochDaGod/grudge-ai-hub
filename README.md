# GRUDA Legion AI Hub

Centralized AI gateway for all Grudge Studio apps.

**Canonical public URL (ONE TRUTH):** `https://ai.grudge-studio.com`  
**Version:** 1.6.1 (puter-space account cloud + asset MIME/loader law in `/v1/context`)

**Attach map:** [`docs/FLEET_ATTACH.md`](./docs/FLEET_ATTACH.md)  
**AI context (Studio + info + agentic + GRD):** [`docs/AI_CONTEXT_SSOT.md`](./docs/AI_CONTEXT_SSOT.md)  
**Deploy hardening:** [`docs/DEPLOY_HARDENING.md`](./docs/DEPLOY_HARDENING.md)  
**Forge-side SSOT:** `Grudge-Studio-Forge/docs/AI_FLEET_ATTACH_SSOT.md`

| Path | Role |
|------|------|
| `GET /` | GRUDA Agent UI (proxied from `UI_ORIGIN`) |
| `GET /puter-space` | Player account cloud (Puter FS + `*.puter.site` deploy — never bag) |
| `GET /health` · `/api/health` | Health JSON (public) — fleet map + context_version |
| `GET /v1/context` | **Full fleet context pack** (agents load first) — includes `puter_space` + `asset_serve` |
| `GET /v1/agents` | Agent catalog (public) |
| `GET /v1/skills` | Agent skill SSOT (sub-agent prompts metadata) |
| `GET /v1/models` · `/v1/ssot` | Model catalog + SSOT pointers (public) |
| `POST /v1/*` | Chat / vision / image / embed (auth) |

Alias host `legion-ai.grudge-studio.com` points at the same hub — prefer **ai.grudge-studio.com** in all clients.

**Primary consumers:** Forge free-ai (`provider=grudge-ai`), puter.grudge-studio.com, fleet games via JWT.  
**Do not** stand up a second brain on Forge — attach via free-ai → this hub.

## Architecture

```
Browser / fleet apps
    │
    └── ai.grudge-studio.com
            ├── grudge-ai-hub (domain)     → UI proxy → UI_ORIGIN
            ├── grudge-legion-ai (paths)   → /v1/*, /health, /api/health
            │       ├── Gemini BYOK + Workers AI
            │       ├── D1 + KV
            │       └── Grudge JWT / API keys
            └── UI_ORIGIN = https://grudaagent.vercel.app
                    (XAI_API_KEY + GRUDGE_AI_KEY — NOT grudge-agent.vercel.app)
```

### Status bar (Grok / Grudge)

| Dot | Green when |
|-----|------------|
| **Grok** | UI health reports `grok: true` (XAI key on **grudaagent**) |
| **Grudge** | Hub up (`grudgeAi: true`) + chat path (server key or sign-in) |

**Never** set `UI_ORIGIN` to `grudge-agent.vercel.app` — that project has no production secrets.

### Deploy both workers (required)

```bash
npx wrangler deploy --config wrangler.domain.toml   # domain + UI proxy
npx wrangler deploy --config wrangler.toml          # path routes /health /v1/*
```

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | Public | Health + upstream VPS status |
| GET | `/v1/agents` | Public | List all agent roles |
| GET | `/v1/skills` | Public | Agent skill SSOT (prompts metadata + models) |
| GET | `/v1/context` | Public | Fleet context pack (info, GRD, agentic, deploy) |
| GET | `/v1/ssot` | Public | URL pointers + context link |
| POST | `/v1/chat` | API key or Grudge JWT | General chat |
| POST | `/v1/agents/:role/chat` | API key or Grudge JWT | Role-specialized chat |
| POST | `/v1/ui/chat` | API key or Grudge JWT | **UI/UX Director** alias (`role=ui`) |
| POST | `/v1/ux/chat` | API key or Grudge JWT | **UX Flow** alias (`role=ux`) |
| POST | `/v1/agents/grudox/chat` | API key or Grudge JWT | **GRUDOxALE** — hub/arcade fleet context |
| POST | `/v1/image/generate` | API key | Stable Diffusion XL image gen |
| POST | `/v1/embed` | API key | BGE text embeddings |
| GET | `/v1/admin/usage` | Admin | Usage analytics |
| GET | `/v1/admin/health` | Admin | Provider diagnostics |
| GET | `/v1/admin/config` | Admin | Agent role config |
| PUT | `/v1/admin/config/:role` | Admin | Update role config |

## Agent Roles

| Role | Model | Escalates to VPS |
|------|-------|------------------|
| general | Llama 3.1 8B | No |
| dev | Llama 3.1 8B → Anthropic | Yes |
| balance | Llama 3.1 8B → Anthropic | Yes |
| lore | Llama 3.1 8B | No |
| art | Llama 3.1 8B → OpenAI | Yes |
| mission | Llama 3.1 8B | No |
| companion | Llama 3.1 8B | No |
| faction | Llama 3.1 8B → Anthropic | Yes |
| **ui** | Gemini 3.5 Flash | No — game UI kits, radials, HUDs (ui.grudge-studio.com) |
| **ux** | Gemini 3.5 Flash | No — auth/editor flow UX |
| **grudox** | Gemini 3.5 Flash | No — GRUDOX hub + arcade (id.grudge-studio.com, shared Railway account) |
| **puter** | Gemini 3.5 Flash | No — Puter KV/FS + puter.grudge-studio.com |
| **toolkit** | Gemini 3.5 Flash | No — PuterJsToolkit dashboard / orchestrator |
| **fleet** | Gemini 3.5 Flash | No — hosts, brands, deploy topology |
| **warlords** | Gemini 3.5 Flash | No — Warlords gameplay / grudge6 combat |
| **convert** | Gemini 3.5 Flash | No — asset bake → R2 |
| **grudge6** | Gemini 3.5 Flash | No — modular kits / Bip001 / anim packs |

### LLM waterfall (Workers AI best usage)

1. **Gemini BYOK** (`GEMINI_API_KEY`) for `google/*` — skips CF AI Gateway balance  
2. **Groq** (`GROQ_API_KEY`) free tier — optional mid path  
3. **Workers AI binding** cascade: primary → `@cf/meta/llama-3.3-70b-instruct-fp8-fast` → `@cf/meta/llama-3.1-8b-instruct-fast`  
4. **Workers AI REST** only if `WORKERS_AI_USER_TOKEN` (prefer binding)

### Identity SSOT (agents must not invent auth)

| Concern | Authority |
|---------|-----------|
| Login UI | `https://id.grudge-studio.com/login` |
| Player JWT | Railway `grudge-api-production-0d46` |
| Shared bag / characters | `/api/account` · `/api/characters` (Bearer JWT) |
| Token keys | `grudge_auth_token`, `grudge_session_token`, `grudge.token`, `sso_token` |
| GRUDOX hub | `https://grudox.grudge-studio.com` · `/account` · `/arcade/` |

`GET /v1/ssot` returns the live pointer map (auth, game_api, grudox, arena_ws, token_keys).

## First-Time Deploy

### 1. Create D1 database

```bash
cd cloudflare/workers/ai-hub
npx wrangler d1 create grudge-ai-hub
# Copy the returned database_id into wrangler.toml
```

### 2. Apply schema

```bash
npx wrangler d1 execute grudge-ai-hub --file=schema.sql
```

### 3. Create KV namespace

```bash
npx wrangler kv namespace create "AI_HUB_KV"
# Copy the returned id into wrangler.toml
```

### 4. Set secrets

```bash
# Gemini BYOK — Google AI Studio key (primary; bypasses Cloudflare AI Gateway balance)
npx wrangler secret put GEMINI_API_KEY
# Or sync from canonical Grudge .env:
#   pwsh scripts/set-gemini-secret.ps1

# Fleet Grudge ID JWT — REQUIRED on BOTH workers (path routes use grudge-legion-ai)
#   pwsh scripts/set-jwt-secret.ps1
# Without JWT_SECRET on grudge-legion-ai, /v1/* rejects member JWTs (API keys only).

# VPS internal key (matches INTERNAL_API_KEY on VPS docker-compose)
npx wrangler secret put VPS_INTERNAL_KEY
```

**Gemini BYOK flow:** When `GEMINI_API_KEY` (or `GOOGLE_API_KEY`) is set, all `google/*` models
call `generativelanguage.googleapis.com` directly. Workers AI + Llama fallback still apply if BYOK
is missing or fails.

### 5. Deploy

```bash
npx wrangler deploy
```

### 6. DNS setup

In Cloudflare dashboard for `grudge-studio.com`:

```
ai   AAAA   100::   (Proxied ☁️)
```

### Production workers (ONE TRUTH)

| Worker | Config | Owns |
|--------|--------|------|
| **grudge-ai-hub** | `wrangler.domain.toml` | Custom domain `ai.grudge-studio.com` — public **GRUDA Agent UI** (proxies `UI_ORIGIN`, default `https://grudaagent.vercel.app`) for non-API paths |
| **grudge-legion-ai** | `wrangler.toml` | Path routes `/v1/*`, `/health`, `/api/health` — Gemini BYOK + Workers AI API |

```bash
npm run deploy          # both workers
npm run deploy:domain   # UI / custom domain only
npm run deploy:api      # legion API routes only
```

### 7. Create your first API key

```bash
# Generate a key
API_KEY=$(openssl rand -hex 32)
echo "Your API key: $API_KEY"

# Hash it
KEY_HASH=$(echo -n "$API_KEY" | sha256sum | cut -d' ' -f1)

# Insert into D1
npx wrangler d1 execute grudge-ai-hub --command="INSERT INTO api_keys (name, key_hash, scope, tier, rpm_limit) VALUES ('admin', '$KEY_HASH', 'admin', 'internal', 300)"
```

### 8. Test

```bash
curl https://ai.grudge-studio.com/health

curl -X POST https://ai.grudge-studio.com/v1/chat \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello from Grudge Studio"}'
```

## Usage from GDevelop Assistant

Set in `.env`:

```
LEGION_HUB_API_KEY=<your-api-key>
LEGION_HUB_URL=https://ai.grudge-studio.com
```

The `LegionHubProvider` in `server/services/ai/providers/legionHub.ts` will be used as the primary AI provider, with Grok as fallback.

## Maintenance Mode

```bash
# Enable
npx wrangler kv key put --namespace-id=<KV_ID> "flag:maintenance" "true"

# Disable
npx wrangler kv key delete --namespace-id=<KV_ID> "flag:maintenance"
```
