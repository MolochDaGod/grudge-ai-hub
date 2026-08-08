# Deploy hardening — Legion + fleet AI surfaces

**Version:** 1.6.0 · machine checklist also on `GET /v1/context` → `deploy_hardening`

## Principles

1. **Intentional deploys** — one product intent per push; name the live URL smoked  
2. **No secrets in git** — `wrangler secret put` only; never `VITE_*` provider keys  
3. **Dual Legion workers** — `grudge-legion-ai` (paths) **and** `grudge-ai-hub` (domain)  
4. **One public brain** — Forge free-ai is hands (service binding `LEGION`), not a second AI domain  
5. **Puter Sites root** — `hosting.list()` → Sites/…/deployment, not Desktop-only  
6. **Railway player SSOT** — Puter mirrors only after successful Railway writes  
7. **Health with version** — every edge service returns JSON version + provider flags  
8. **CORS allowlist** — `*.grudge-studio.com` + known puter.site production hosts  

## Pre-deploy

| Check | How |
|-------|-----|
| No `.env` staged | `git status` |
| Version aligned | `package.json` + `HUB_VERSION` + context `CONTEXT_VERSION` |
| Build/wrangler | `npm run deploy:api` dry path or full deploy |
| JWT on both workers | `JWT_SECRET` when verifying Grudge members |

## Deploy commands

```bash
# Legion (both workers) — F:\GitHub\grudge-ai-hub
npm run deploy

# Path routes only
npm run deploy:api

# Domain hub only
npm run deploy:domain

# Re-seed agent skills to D1
npm run db:skills

# Post-deploy smoke
npm run smoke
```

```bash
# Forge free-ai
cd F:\GitHub\Grudge-Studio-Forge\workers\forge-free-ai
npx wrangler deploy

# Puter bridge
cd …/PuterJsToolkit
npm run deploy:bridge

# Coder SPA (GRD)
# see grudge-coder skill + DEPLOY_CODER.md — Pages project grudgechain-vibe-ide
```

## Post-deploy smoke (required)

| URL | Expect |
|-----|--------|
| https://ai.grudge-studio.com/health | `ok`, version ≥ 1.6.0 |
| https://ai.grudge-studio.com/v1/context | `ok`, brands + ai_deployable |
| https://ai.grudge-studio.com/v1/skills | skill count ≥ 20 |
| https://ai.grudge-studio.com/v1/ssot | context pointer present |
| https://forge.grudge-studio.com/api/free-ai/status | legionBinding true |
| https://puter.grudge-studio.com/api/health | ok |
| https://info.grudge-studio.com/docs | 200 |
| https://coder.grudge-studio.com/ | 200 |
| https://objectstore.grudge-studio.com/api/v1/fleet-canonical.json | 200 |

## Secrets still often missing

| Secret | Workers | Effect if missing |
|--------|---------|-------------------|
| `GROQ_API_KEY` | both Legion | mid waterfall skipped |
| `GRUDGE_AI_KEY` | free-ai | guest Legion without user JWT fails |
| `JWT_SECRET` | both Legion | only API keys / admin paths |

## Anti-patterns

- Deploy only one of the two Legion workers  
- Provider keys in SPA / puter.site HTML  
- Treating Coder AI Hub as Legion  
- Desktop-only Puter upload  
- Merging brand SPAs “for convenience”  

## Report template

```
Deployed: <workers/hosts>
Version: <x.y.z>
Smoked: <urls + status>
Secrets still open: <list or none>
Local-only: <anything not edge-live>
```
