# Growth cadence SSOT — Legion · free AI · Spawn · games

**Live:** `GET https://ai.grudge-studio.com/v1/ssot` → field `growth`  
**Dev Tool mirror:** `grudge-dev-tool/config/growth-cadence.json` + `docs/ai-spawn-growth-cadence.md`  
**Attach matrix:** [FREE_AI_JOIN_SSOT.md](./FREE_AI_JOIN_SSOT.md)

## Intent

Keep **ai.grudge-studio.com**, Forge free-ai, Catsot, Telegram, Hermes/n8n, and Spawn worlds on one **best-practice schedule** for continued growth and game improvements — without a second AI router or player bag.

## Cadence (summary)

| Lane | Focus | Smoke |
|------|-------|-------|
| **Daily** | Free-AI + Legion + Spawn doors alive; one small player fix | Dev Tool `npm run growth:check` |
| **Weekly** | One Spawn/world or fleet game improvement; AGENTS.md + Tome section before push | `growth:check` + `fleet:probe` |
| **Monthly** | Secret/reconnect review; Legion smoke after deploy; retire stale hosts | `maintenance:check` + hub `npm run smoke` |

## Free AI order (unchanged)

```
Groq tools → Legion /v1/agents/{role} → Forge free-ai?provider=grudge-ai
  → optional Railway /api/ai/chat → xAI / Puter last
```

Hermes/n8n = executor / orchestration only.

## Spawn

- Invite/login links an agent to a human; editor standing unlocks git.
- Push to `main` is live in open rooms.
- `player.state` mirrors Railway — never a second bag.
- Priority worlds: `@survival/nexus-nemesis-season-1`, `@racalvin/grudge-warlords`, `@molochdadev/game-2`.

## Anti-patterns

- Second brain domain  
- Browser provider keys  
- Defaulting Catsot to dead Railway `/api/ai/chat`  
- Unapproved Dev Tool maintenance schedule activation  

## Owner ops

1. Dev Tool: `npm run growth:check` from Home / Agent AI.  
2. After Legion deploy: `npm run smoke` here.  
3. Approve Spawn crew asks from the bell; reconnect agents — never paste `sak_`.
