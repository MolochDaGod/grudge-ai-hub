# Legion AI Context SSOT — Grudge Studio understanding

**Canonical pack (machine):** `GET https://ai.grudge-studio.com/v1/context`  
**Pointers:** `GET https://ai.grudge-studio.com/v1/ssot`  
**Agent roles:** `GET https://ai.grudge-studio.com/v1/skills`  
**Version:** 1.6.1 · code `lib/fleetContext.js` + `lib/agentSkills.js`

This is how **Legion and fleet agents** learn Grudge Studio topology, **info.grudge-studio.com**, deployable AI systems, **agentic / GRD Grudachain**, and deploy law — without inventing parallel hosts.

---

## Load order (agents)

1. `GET /v1/context` — full pack (one_truth, brands, ai_deployable, agentic, deploy_hardening, grd, info)
2. `GET /v1/ssot` — URL pointers only
3. Human docs: `https://info.grudge-studio.com/docs` · codex `…/CANONICAL_CODEX.md`
4. Machine fleet: `https://objectstore.grudge-studio.com/api/v1/fleet-canonical.json`
5. Pick **brand host** — never merge Open / GRUDOX / Forge / Warlords into one SPA

---

## ONE TRUTH (summary)

| Concern | Authority |
|---------|-----------|
| Identity JWT | `id.grudge-studio.com` |
| Player bag / heroes / wallet | Railway `grudge-api-production-0d46` |
| Definitions JSON | ObjectStore `/api/v1` (info may mirror) |
| Binaries | `assets.grudge-studio.com` (R2) — MIME + `loadRaceKit` / `gltfProdLoader` |
| Asset search index | D1 only — not player SSOT |
| Account cloud files | **https://ai.grudge-studio.com/puter-space** (Puter FS + `*.puter.site` — never bag) |
| Docs hub | **info.grudge-studio.com** (`/` → `/docs`) |
| Fleet AI brain | **ai.grudge-studio.com** (Legion) |
| Puter toolkit | `puter.grudge-studio.com` — User-Pays cache / projects only |

---

## info.grudge-studio.com

| URL | Role |
|-----|------|
| `https://info.grudge-studio.com/docs` | HTML docs hub (200) |
| `…/docs/CANONICAL_CODEX.md` | Human ONE TRUTH index |
| ObjectStore `docs-catalog.json` | Machine catalog of docs + API |
| ObjectStore `fleet-canonical.json` | Machine ONE TRUTH |

**Note:** Prefer `objectstore.grudge-studio.com/api/v1/*.json` for game defs if info `/api/v1` returns 404. Legion skill role: **`info`**.

---

## AI deployable systems

| System | Host | Role |
|--------|------|------|
| **Legion** | ai.grudge-studio.com | Chat, skills, context, vision, embed |
| **Forge free-ai** | forge…/api/free-ai/* | Same-origin hands + LEGION binding |
| **Puter edge** | puter.grudge-studio.com | Toolkit SPA + AI bridge |
| **GRD / Grudachain** | coder. + grudachain. | Agentic IDE (GRUDAIDE) |
| **Coder AI Hub worker** | workers/ai-hub in GrudachainCode | Job events only — **not** Legion chat |
| **Info / ObjectStore** | info. + objectstore. | Docs + definitions |

---

## Agentic + GRD / Grudachain

**Agentic** = multi-step agents with tools/skills, still bound to ONE TRUTH.

| Layer | Surface |
|-------|---------|
| Legion roles | `POST /v1/agents/{role}/chat` |
| GRUDAIDE | coder IDE modules (MCP, index, orchestrator, Director) |
| Coder pipelines | code · deploy · create · organize · gamedev |
| Forge Auto | free-ai waterfall → Legion first |

**GRD** = GrudgeChain Vibe IDE plane (`coder.grudge-studio.com` = `grudachain.grudge-studio.com`).  
Admin Puter user `grudachain` ≠ fleet game identity (still Grudge ID JWT for Railway).

Legion roles: **`agentic`**, **`coder`**, **`grudachain`** (aliases: grd, vibe, grudaide → coder).

---

## Deploy hardening

See [DEPLOY_HARDENING.md](./DEPLOY_HARDENING.md). Principles live in context pack `deploy_hardening`.

```bash
npm run deploy          # both workers
npm run smoke           # post-deploy URL checks
npm run db:skills       # re-seed D1 roles after skill updates
```

---

## Related

- [FLEET_ATTACH.md](./FLEET_ATTACH.md) — client attach map  
- Forge `docs/AI_FLEET_ATTACH_SSOT.md`  
- Puter `docs/PUTER_BRIDGE_DEPLOY.md`  
- Skill `grudge-coder` · umbrella `grudge-studio`  
