# Free AI join SSOT — Catsot · Legion · Forge · Telegram · Hermes

**One public brain:** `https://ai.grudge-studio.com` (Legion hub **1.6.13+**)  
**Do not** invent a second router domain. Hands and agents **attach**.

Smoked **2026-10-06** from studio workstation.

---

## Who holds what

| Surface | Live URL | Holds | Role in join |
|---------|----------|-------|--------------|
| **Legion** | `ai.grudge-studio.com` | Free waterfall (Gemini BYOK → Groq → Workers AI), agent roles, `/v1/context` · `/v1/ssot` · `/v1/skills` | **Brain** |
| **Forge free-ai** | `forge.grudge-studio.com/api/free-ai/*` | Worker `grudge-forge-free-ai` + service binding `LEGION` + guest `GRUDGE_AI_KEY` | **Hands** (editor / no-secret text) |
| **Catsot** (Grok Builder) | `grok-builder-agent.grudge.workers.dev` + SPA | ALE companion tools, scene, Groq tools path | **In-world companion** |
| **Telegram** | `@grudagamebot` · Railway `grudge-agent-bot-production` | Groq agent loop + GitHub/shell/fleet/Treaty | **Ops CLI surface** |
| **Hermes** | `hermes-agent.0umigil.cserverhost.cloud` | Nous Hermes UI + `/api/chat` (auth) | **VPS ALE / GRUDA executor** |
| **n8n** | `n8n.0umigil.cserverhost.cloud` | Workflows / cron / deploy bus | **Orchestration** (not chat origin) |
| **Railway gruda-ai-router** | `…/api/ai/chat` | Skill `gruda-ai-router` | **Gap** — often **404**; optional only |

Dev Tool map: `FLEET_URLS.vpsN8n` / `vpsHermes` · `docs/vps-ionos-ai.md`.

---

## Call order (cheap → paid)

```
Client (Catsot / Telegram / Forge SPA)
    │
    ├─1─ Groq free (tools)          ← Telegram primary; Catsot tools
    ├─2─ Legion /v1/agents/{role}   ← needs Bearer GRUDGE_AI_KEY or JWT
    ├─3─ Forge free-ai?provider=grudge-ai  ← guest Legion (Workers AI etc.)
    ├─4─ Optional Railway /api/ai/chat     ← only if mounted
    └─5─ xAI / Puter User-Pays             ← last / opt-in
```

VPS Hermes is **executor** (privileged ops), not a parallel `POST /api/ai/chat` origin.  
Legion may escalate with `VPS_ENABLED=true` + `VPS_AI_AGENT_URL` + `VPS_INTERNAL_KEY` — currently **disabled** on live health (`vps_ai_agent: disabled`).

---

## Live smoke (2026-10-06)

| Check | Result |
|-------|--------|
| `GET ai…/v1/health` | **200** version 1.6.13, free waterfall live |
| `GET forge…/api/free-ai/status` | **200** `legionBinding:true` `guestLegionKey:true` |
| `POST forge…/api/free-ai/chat?provider=grudge-ai` (no client key) | **200** Workers AI `pong` |
| `GET catsot worker /health` | **200** Groq+xAI; **legion:false** until `GRUDGE_AI_KEY` |
| `GET telegram /health` | **200** provider groq, tools ≥27 |
| `GET hermes…/api/health` | **200** `{ ok, version:0.21.3, auth_required:true }` |
| `GET n8n…/healthz` | **200** (after gate redirect) |
| `POST Railway …/api/ai/chat` | **404** — do not depend on it |
| VPS Ollama `:11434` | **timeout** from studio — desktop/`gruda` Ollama preferred |

---

## Wire checklist (extend SSOT — no forks)

### Catsot worker (`grok-builder-agent`)

1. Waterfall: Groq → Legion companion → **Forge free-ai** → optional `AI_ROUTER_URL` → xAI.  
2. Prefer `wrangler secret put GRUDGE_AI_KEY` so step 2 works for companion quality.  
3. Do not default to dead Railway `/api/ai/chat`.

### Telegram (`grudge-agent-bot`)

Tools (join): `free_ai_join_status`, `legion_chat`, `forge_free_ai_chat`, `hermes_health`, `hermes_chat`.  
Env: `GRUDGE_AI_KEY` (optional), `HERMES_URL`, `HERMES_API_KEY` or `HERMES_SESSION_COOKIE`.

### Forge

Already correct: SPA → same-origin `/api/free-ai/*` → Legion binding. Never call Gemini/Groq from the browser.

### Legion ↔ Hermes

```bash
# On both grudge-legion-ai + grudge-ai-hub (owner):
npx wrangler secret put VPS_AI_AGENT_URL   # https://hermes-agent.0umigil.cserverhost.cloud
npx wrangler secret put VPS_INTERNAL_KEY  # match Hermes internal/API auth
npx wrangler secret put VPS_ENABLED       # true
```

Then smoke: health shows `vps_ai_agent` ≠ `disabled`. Hermes `/api/chat` still needs auth (`auth_required`).

### Railway gruda-ai-router (optional)

Skill: `~/.grok/skills/gruda-ai-router`. Mount at `/api/ai` on `grudge-api` **or** leave unset and use Forge/Legion. Do not stand up IONOS as a second chat API.

---

## Anti-patterns

- Second public brain domain next to `ai.grudge-studio.com`  
- Browser `puter.ai.chat` / provider keys in Vite  
- Treating Hermes/n8n as player SSOT or bag DB  
- Running 70B Ollama on the 4 GB VPS (use desktop `gruda` / Workers AI)  
- Pointing Catsot at Railway `/api/ai/chat` while it 404s  

---

## Growth schedule

Daily / weekly / monthly best practices for free AI + Spawn + game improvements:  
[GROWTH_CADENCE_SSOT.md](./GROWTH_CADENCE_SSOT.md) · Dev Tool `npm run growth:check` · Legion cron writes `KV growth:last-check`.

## Related

- [WIRING.md](./WIRING.md) · [FLEET_ATTACH.md](./FLEET_ATTACH.md) · [DEPLOY_HARDENING.md](./DEPLOY_HARDENING.md) · [GROWTH_CADENCE_SSOT.md](./GROWTH_CADENCE_SSOT.md)  
- Skills: `gruda-ai-router` · `gruda-telegram-agent` · `gruda-one-model`  
- Dev Tool: `docs/vps-ionos-ai.md` · `docs/ai-spawn-growth-cadence.md`  
- Forge: `docs/AI_FLEET_ATTACH_SSOT.md`
