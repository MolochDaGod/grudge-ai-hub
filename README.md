# GRUDA Legion AI Hub

Centralized AI gateway for all Grudge Studio apps.

**Canonical public URL (ONE TRUTH):** `https://ai.grudge-studio.com`  
**Version:** 1.3.0 (status-bar health + Grok/Grudge wiring)

| Path | Role |
|------|------|
| `GET /` | GRUDA Agent UI (proxied from `UI_ORIGIN`) |
| `GET /health` · `/api/health` | Health JSON (public) — includes `grok` / `grudgeAi` for UI dots |
| `GET /v1/agents` | Agent catalog (public) |
| `GET /v1/models` · `/v1/ssot` | Model catalog + SSOT pointers (public) |
| `POST /v1/*` | Chat / vision / image / embed (auth) |

Alias host `legion-ai.grudge-studio.com` points at the same hub — prefer **ai.grudge-studio.com** in all clients.

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
| POST | `/v1/chat` | API key or Grudge JWT | General chat |
| POST | `/v1/agents/:role/chat` | API key or Grudge JWT | Role-specialized chat |
| POST | `/v1/ui/chat` | API key or Grudge JWT | **UI/UX Director** alias (`role=ui`) |
| POST | `/v1/ux/chat` | API key or Grudge JWT | **UX Flow** alias (`role=ux`) |
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
