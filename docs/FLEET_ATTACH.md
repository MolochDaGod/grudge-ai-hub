# Legion attach map — fleet consumers

**Canonical brain:** `https://ai.grudge-studio.com`  
**Version:** 1.6.0+  
**Context pack:** `GET /v1/context` · [AI_CONTEXT_SSOT.md](./AI_CONTEXT_SSOT.md) · [DEPLOY_HARDENING.md](./DEPLOY_HARDENING.md)

This doc is the **attach SSOT for clients** (Forge, Puter toolkit, Open, Coder/GRD).  
Forge-side detail: `Grudge-Studio-Forge/docs/AI_FLEET_ATTACH_SSOT.md`.

---

## Who should call Legion

| Client | How | Auth |
|--------|-----|------|
| **Forge free-ai** | `POST /api/free-ai/chat?provider=grudge-ai` → Legion | User JWT or `GRUDGE_AI_KEY` |
| **Forge SPA** | Same-origin free-ai (never call providers from browser) | Grudge ID + Puter |
| **puter.grudge-studio.com** | Edge `/api/ai/*` or Legion `/v1/*` | Grudge JWT |
| **Other fleet games** | Prefer same-origin `/api/ai` rewrite → Legion | Grudge JWT |

---

## Agent skills (sub-agents)

Public catalog: `GET https://ai.grudge-studio.com/v1/skills`

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

## Cloudflare AI on Legion only

| Binding / product | Status | Notes |
|-------------------|--------|-------|
| `env.AI` Workers AI | Live | Strong + fast cascade |
| Gemini BYOK | Live | `GEMINI_API_KEY` |
| Groq | Code ready | Set `GROQ_API_KEY` on **both** workers |
| Embeddings `/v1/embed` | Live | For future RAG |
| Queue `grudge-ai-events` | Bound | Wire consumers for long jobs |
| Vectorize | Not yet | Optional knowledge packs |

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
# expect: version 1.5.x, gemini_byok configured, workers_ai available
# after Groq: "groq":"configured"
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
- [ ] free-ai `GRUDGE_AI_KEY` for guests  
- [ ] Agent jobs invoke Legion roles  
