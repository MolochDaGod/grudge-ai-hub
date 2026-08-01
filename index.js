/**
 * GRUDA Legion AI Hub — Cloudflare Worker
 *
 * Centralized AI gateway for all Grudge Studio apps.
 * Workers AI (Gemini 3.5 Flash + @cf models). VPS fallback optional (off in production).
 *
 * Routes:
 *   GET    /health                  Health check (public)
 *   GET    /api/health              Fleet health alias (public)
 *   GET    /                        GRUDA Agent UI (proxied from UI_ORIGIN)
 *   GET    /v1/agents               List agent roles (public)
 *   POST   /v1/chat                 General chat (auth)
 *   POST   /v1/agents/:role/chat    Role-specialized chat (auth)
 *   POST   /v1/vision               Image + text (Gemini vision, auth)
 *   POST   /v1/image/generate       Image generation (auth)
 *   POST   /v1/embed                Text embeddings (auth)
 *   GET    /v1/admin/usage          Usage analytics (admin)
 *   GET    /v1/admin/health         Provider diagnostics (admin)
 *   GET    /v1/admin/config         Agent role config (admin)
 *   PUT    /v1/admin/config/:role   Update role config (admin)
 */

import {
  DEFAULT_GEMINI_MODEL,
  DEFAULT_CF_MODEL,
  isGeminiModel,
  isGeminiByokConfigured,
  runWorkersAi,
} from './lib/aiRunner.js';
import { Observatory } from './lib/observatory-client.js';

const DEFAULT_OBS_ENDPOINT =
  'https://grudge-fleet-harbor.grudge.workers.dev/api/observatory';

function fleetObs(env, ctx) {
  if (!env.OBSERVATORY_KEY) return null;
  // Prefer var/secret OBSERVATORY_URL; fall back to fleet harbor (obs.* DNS may be pending)
  const endpoint = (env.OBSERVATORY_URL || DEFAULT_OBS_ENDPOINT).replace(/\/$/, '');
  return new Observatory({
    endpoint,
    source: 'grudge-ai-hub',
    key: env.OBSERVATORY_KEY,
    // Post-response telemetry — never block the AI response on log ingest
    waitUntil: ctx.waitUntil.bind(ctx),
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const method = request.method;
    const origin = request.headers.get('Origin') || '';
    const requestId = crypto.randomUUID();
    const obs = fleetObs(env, ctx);
    const t0 = Date.now();

    // ── CORS preflight ─────────────────────────────────────────
    if (method === 'OPTIONS') {
      return corsResponse(new Response(null, { status: 204 }), origin);
    }

    try {
      // ── Maintenance mode check ─────────────────────────────────
      const maintenance = await env.KV.get('flag:maintenance');
      if (maintenance === 'true' && !url.pathname.startsWith('/v1/admin')) {
        return finish(obs, request, corsResponse(json({ error: 'AI Hub is under maintenance', retry_after: 60 }, 503), origin), t0);
      }

      // ── Router ─────────────────────────────────────────────────

      // Public gateway routes (worker-owned) — no auth
      if (url.pathname === '/health' || url.pathname === '/v1/health' || url.pathname === '/api/health') {
        return finish(obs, request, corsResponse(await handleHealth(env), origin), t0);
      }
      if (url.pathname === '/v1/agents' && method === 'GET') {
        return finish(obs, request, corsResponse(await handleListAgents(env), origin), t0);
      }
      // Public model/catalog discovery (fleet clients + info site)
      if ((url.pathname === '/v1/models' || url.pathname === '/v1/catalog') && method === 'GET') {
        return finish(obs, request, corsResponse(await handlePublicModels(env), origin), t0);
      }
      if (url.pathname === '/v1/ssot' && method === 'GET') {
        return finish(obs, request, corsResponse(handleSsotPointers(), origin), t0);
      }
      // Rapier fleet physics agent context (public — no auth)
      if (url.pathname === '/v1/rapier/checklist' && method === 'GET') {
        return finish(obs, request, corsResponse(handleRapierChecklist(), origin), t0);
      }
      if (url.pathname === '/v1/rapier/system' && method === 'GET') {
        return finish(obs, request, corsResponse(handleRapierSystem(), origin), t0);
      }

      // UI + gruda-agent API — proxy to Vercel (handles ?grudge_token= SSO landing)
      if (!url.pathname.startsWith('/v1/')) {
        return finish(obs, request, await proxyToUi(request, env, origin), t0);
      }

      // ── Payload size guard ───────────────────────────────────
      const maxBytes = parseInt(env.MAX_PAYLOAD_BYTES || '65536', 10);
      if (method === 'POST') {
        const contentLength = parseInt(request.headers.get('content-length') || '0', 10);
        if (contentLength > maxBytes) {
          return finish(obs, request, corsResponse(json({ error: `Payload too large (max ${maxBytes} bytes)` }, 413), origin), t0);
        }
      }

      // ── Auth required beyond this point ────────────────────────
      const auth = await authenticate(request, env);
      if (auth.error) {
        return finish(obs, request, corsResponse(json({ error: auth.error }, 401), origin), t0);
      }

      // ── Rate limiting ──────────────────────────────────────────
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const rateKey = auth.keyId ? `rl:key:${auth.keyId}` : `rl:ip:${ip}`;
      const rpm = auth.scope === 'admin'
        ? parseInt(env.RATE_LIMIT_RPM_ADMIN || '300', 10)
        : (auth.rpmLimit || parseInt(env.RATE_LIMIT_RPM || '60', 10));

      const limited = await checkRateLimit(env.KV, rateKey, rpm);
      if (limited) {
        await logRequest(env, { requestId, apiKeyId: auth.keyId, role: null, provider: 'none', model: null, status: 'rate-limited', latencyMs: 0 });
        const res = corsResponse(json({ error: 'Rate limit exceeded', retry_after: 60 }, 429), origin);
        res.headers.set('Retry-After', '60');
        res.headers.set('X-RateLimit-Limit', String(rpm));
        return finish(obs, request, res, t0);
      }

      // ── Authenticated routes ───────────────────────────────────

      // POST /v1/chat
      if (url.pathname === '/v1/chat' && method === 'POST') {
        return finish(obs, request, corsResponse(await handleChat(request, env, auth, requestId, 'general'), origin), t0);
      }

      // POST /v1/agents/:role/chat
      const roleMatch = url.pathname.match(/^\/v1\/agents\/([a-z]+)\/chat$/);
      if (roleMatch && method === 'POST') {
        return finish(obs, request, corsResponse(await handleChat(request, env, auth, requestId, roleMatch[1]), origin), t0);
      }

      // Convenience aliases for ui.grudge-studio.com + fleet UI clients
      // POST /v1/ui/chat  → ui agent
      // POST /v1/ux/chat  → ux agent
      if (url.pathname === '/v1/ui/chat' && method === 'POST') {
        return finish(obs, request, corsResponse(await handleChat(request, env, auth, requestId, 'ui'), origin), t0);
      }
      if (url.pathname === '/v1/ux/chat' && method === 'POST') {
        return finish(obs, request, corsResponse(await handleChat(request, env, auth, requestId, 'ux'), origin), t0);
      }

      // POST /v1/vision — Gemini multimodal (logo analysis, screenshots, etc.)
      if (url.pathname === '/v1/vision' && method === 'POST') {
        return finish(obs, request, corsResponse(await handleVision(request, env, auth, requestId), origin), t0);
      }

      // POST /v1/image/generate
      if (url.pathname === '/v1/image/generate' && method === 'POST') {
        return finish(obs, request, corsResponse(await handleImageGenerate(request, env, auth, requestId), origin), t0);
      }

      // POST /v1/embed
      if (url.pathname === '/v1/embed' && method === 'POST') {
        return finish(obs, request, corsResponse(await handleEmbed(request, env, auth, requestId), origin), t0);
      }

      // ── Admin routes ───────────────────────────────────────────
      if (url.pathname.startsWith('/v1/admin')) {
        if (auth.scope !== 'admin') {
          return corsResponse(json({ error: 'Admin access required' }, 403), origin);
        }

        if (url.pathname === '/v1/admin/usage' && method === 'GET') {
          return corsResponse(await handleAdminUsage(url, env), origin);
        }
        if (url.pathname === '/v1/admin/health' && method === 'GET') {
          return corsResponse(await handleAdminHealth(env), origin);
        }
        if (url.pathname === '/v1/admin/config' && method === 'GET') {
          return corsResponse(await handleAdminConfig(env), origin);
        }
        const configMatch = url.pathname.match(/^\/v1\/admin\/config\/([a-z]+)$/);
        if (configMatch && method === 'PUT') {
          return corsResponse(await handleAdminUpdateConfig(request, env, configMatch[1]), origin);
        }
      }

      return finish(obs, request, corsResponse(json({ error: 'Not found' }, 404), origin), t0);
    } catch (err) {
      obs?.error(String(err), { path: url.pathname, request_id: requestId });
      console.error('Unhandled error:', err);
      return corsResponse(json({ error: 'Internal server error', request_id: requestId }, 500), origin);
    }
  },

  // Legacy AI_EVENTS consumer (kept so domain worker can redeploy while queue is still attached).
  async queue(batch) {
    for (const msg of batch.messages) {
      try {
        msg.ack();
      } catch {
        /* ignore */
      }
    }
  },
};

function finish(obs, request, response, t0) {
  if (obs) {
    const path = new URL(request.url).pathname;
    if (!path.startsWith('/v1/admin')) {
      obs.http({
        method: request.method,
        path,
        status: response.status,
        latency_ms: Date.now() - t0,
      });
    }
  }
  return response;
}


// ════════════════════════════════════════════════════════════════
//  Authentication
// ════════════════════════════════════════════════════════════════

async function authenticate(request, env) {
  const header = request.headers.get('Authorization') || '';
  const apiKey = header.startsWith('Bearer ') ? header.slice(7) : header;

  if (!apiKey) {
    return { error: 'Missing Authorization header (Bearer <api-key|grudge_jwt>)' };
  }

  // 1) Fleet Grudge ID JWT (same secret as Railway / id gateway) — member chat
  if (env.JWT_SECRET && apiKey.split('.').length === 3) {
    const payload = await verifyHs256Jwt(apiKey, env.JWT_SECRET);
    if (payload) {
      const grudgeId = String(payload.grudge_id || payload.sub || payload.userId || 'jwt-user');
      const tier = String(payload.tier || payload.role || 'member');
      const scope = tier === 'admin' || tier === 'master_admin' ? 'admin' : 'member';
      return {
        keyId: `jwt:${grudgeId}`,
        name: grudgeId,
        scope,
        tier,
        rpmLimit: scope === 'admin' ? 300 : 120,
        authType: 'grudge_jwt',
      };
    }
  }

  // 2) Hash the key and look up in D1 api_keys
  const keyHash = await sha256(apiKey);

  try {
    const row = await env.DB.prepare(
      'SELECT id, name, scope, tier, rpm_limit, enabled FROM api_keys WHERE key_hash = ?'
    ).bind(keyHash).first();

    if (!row) {
      return { error: 'Invalid API key or JWT' };
    }
    if (!row.enabled) {
      return { error: 'API key disabled' };
    }

    // Update last_used (fire and forget)
    env.DB.prepare('UPDATE api_keys SET last_used = datetime(\'now\') WHERE id = ?')
      .bind(row.id).run().catch(() => {});

    return { keyId: row.id, name: row.name, scope: row.scope, tier: row.tier, rpmLimit: row.rpm_limit, authType: 'api_key' };
  } catch (err) {
    // D1 unavailable — allow with default limits if key matches env fallback
    console.warn('D1 auth lookup failed, checking env fallback:', err.message);
    const fallbackKey = env.VPS_INTERNAL_KEY;
    if (fallbackKey && apiKey === fallbackKey) {
      return { keyId: 'env-fallback', name: 'internal', scope: 'admin', tier: 'internal', rpmLimit: 300, authType: 'env' };
    }
    return { error: 'Authentication service unavailable' };
  }
}

/** Workers-compatible HS256 JWT verify (Grudge ID tokens). */
async function verifyHs256Jwt(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    const sigInput = enc.encode(`${parts[0]}.${parts[1]}`);
    const sigB64 = parts[2].replace(/-/g, '+').replace(/_/g, '/');
    const pad = '='.repeat((4 - (sigB64.length % 4)) % 4);
    const sigBin = atob(sigB64 + pad);
    const sig = new Uint8Array(sigBin.length);
    for (let i = 0; i < sigBin.length; i++) sig[i] = sigBin.charCodeAt(i);
    const ok = await crypto.subtle.verify('HMAC', key, sig, sigInput);
    if (!ok) return null;
    const payloadJson = new TextDecoder().decode(
      Uint8Array.from(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (parts[1].length % 4)) % 4)), (c) => c.charCodeAt(0)),
    );
    const payload = JSON.parse(payloadJson);
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
}


// ════════════════════════════════════════════════════════════════
//  Rate Limiting (KV-based sliding window)
// ════════════════════════════════════════════════════════════════

async function checkRateLimit(kv, key, maxRpm) {
  try {
    const now = Math.floor(Date.now() / 1000);
    const windowKey = `${key}:${Math.floor(now / 60)}`;
    const count = parseInt(await kv.get(windowKey) || '0', 10);

    if (count >= maxRpm) return true;

    // Increment (fire and forget, async — doesn't block response)
    kv.put(windowKey, String(count + 1), { expirationTtl: 120 }).catch(() => {});
    return false;
  } catch {
    // KV unavailable — fail open
    return false;
  }
}


// ════════════════════════════════════════════════════════════════
//  Handlers
// ════════════════════════════════════════════════════════════════

/** GET /health */
async function handleHealth(env) {
  const vpsStatus = await getVpsHealthStatus(env);

  return json({
    status: 'ok',
    ok: true,
    service: 'grudge-ai-hub',
    version: '1.2.0',
    environment: env.ENVIRONMENT || 'production',
    providers: {
      gemini_byok: isGeminiByokConfigured(env) ? 'configured' : 'missing',
      workers_ai: 'available',
      vps_ai_agent: vpsStatus,
      grudge_jwt: env.JWT_SECRET ? 'configured' : 'optional',
    },
    fleet: {
      identity: 'https://id.grudge-studio.com',
      gameData: 'https://grudge-api-production-0d46.up.railway.app',
      objectStore: 'https://objectstore.grudge-studio.com/api/v1',
      assets: 'https://assets.grudge-studio.com',
      docs: 'https://info.grudge-studio.com',
      canonical: 'https://objectstore.grudge-studio.com/api/v1/fleet-canonical.json',
    },
    public_routes: ['/health', '/api/health', '/v1/agents', '/v1/models', '/v1/ssot'],
    timestamp: new Date().toISOString(),
  });
}

function handleSsotPointers() {
  return json({
    ok: true,
    codex: 'https://info.grudge-studio.com/docs/CANONICAL_CODEX.md',
    fleet_canonical: 'https://objectstore.grudge-studio.com/api/v1/fleet-canonical.json',
    warlords_production: 'https://objectstore.grudge-studio.com/api/v1/warlords-production.json',
    docs_catalog: 'https://objectstore.grudge-studio.com/api/v1/docs-catalog.json',
    auth: 'https://id.grudge-studio.com',
    game_api: 'https://grudge-api-production-0d46.up.railway.app',
    rapier_api: 'https://rapier.rs/docs/api/javascript/JavaScript3D',
    rapier_checklist: '/v1/rapier/checklist',
  });
}

const RAPIER_SYSTEM = `You are the Grudge Studio Rapier physics deploy agent.
Official Rapier JS 3D API: https://rapier.rs/docs/api/javascript/JavaScript3D
Fleet skill: grudge-rapier. Surfaces: grudgewarlords.com Island3D PhysicsWorld, Mine-Loader WorldPhysics.

HARD RULES:
1. SI meters only — human ~1.8m (capsule r=0.32, halfH=0.55). Never pixel physics.
2. Fixed timestep 1/60 — never variable frame dt alone.
3. Dynamic bodies need density>0 (zero mass = infinite mass).
4. CCT = kinematic position-based; gravity in desired movement; setNextKinematicTranslation.
5. Trimesh colliders on FIXED bodies only — not dynamic.
6. Same create order + same @dimforge/rapier3d-compat version for determinism/snapshots.
7. Package: "@dimforge/rapier3d-compat": "^0.19.3"

Code SSOT:
- GrudgeBuilder: client/src/island3d/physics/PhysicsWorld.ts + fleet/*
- Mine-Loader: artifacts/voxelcraft/src/lib/physics/*
- Docs: GrudgeBuilder/docs/RAPIER_FLEET.md

Deploy grudgewarlords.com: Vercel alias from GrudgeBuilder main (vercel.json).
Do not invent Cannon-ES APIs on Rapier projects. Prefer fleet presets over ad-hoc ColliderDesc.`;

function handleRapierChecklist() {
  return json({
    ok: true,
    service: 'grudge-ai-hub',
    topic: 'rapier-fleet',
    apiDocs: 'https://rapier.rs/docs/api/javascript/JavaScript3D',
    package: { name: '@dimforge/rapier3d-compat', version: '^0.19.3' },
    domains: ['grudgewarlords.com', 'client.grudge-studio.com'],
    code: {
      island3d: 'client/src/island3d/physics/PhysicsWorld.ts',
      fleet: 'client/src/island3d/physics/fleet/',
      skill: 'grudge-rapier',
    },
    checklist: [
      'dep @dimforge/rapier3d-compat@^0.19.3',
      'fixed step 1/60',
      'SI meters + human 1.8m CCT',
      'density>0 on dynamics',
      'trimesh fixed-only',
      'physics debug gated (?physicsDebug=1)',
      'Vercel main → grudgewarlords.com',
    ],
  });
}

function handleRapierSystem() {
  return json({
    ok: true,
    role: 'rapier-deploy',
    system: RAPIER_SYSTEM,
  });
}

/** GET /v1/models — public model + agent catalog for fleet clients */
async function handlePublicModels(env) {
  const agentsRes = await handleListAgents(env);
  let agents = [];
  try {
    const body = await agentsRes.json();
    agents = body.agents || [];
  } catch { /* ignore */ }

  const models = [
    {
      id: env.DEFAULT_AI_MODEL || DEFAULT_GEMINI_MODEL || 'google/gemini-3.5-flash',
      provider: 'gemini',
      capability: 'chat',
      default: true,
    },
    {
      id: env.FALLBACK_AI_MODEL || DEFAULT_CF_MODEL || '@cf/meta/llama-3.1-8b-instruct-fast',
      provider: 'workers_ai',
      capability: 'chat',
      default: false,
    },
  ];

  return json({
    ok: true,
    service: 'grudge-ai-hub',
    version: '1.2.0',
    models,
    agents,
    auth: {
      chat: 'Bearer API key (D1 api_keys) or Grudge ID JWT when JWT_SECRET is set',
      public: ['/v1/models', '/v1/agents', '/health', '/v1/ssot'],
    },
    endpoints: {
      chat: 'POST /v1/chat',
      agent_chat: 'POST /v1/agents/:role/chat',
      vision: 'POST /v1/vision',
      image: 'POST /v1/image/generate',
      embed: 'POST /v1/embed',
    },
  });
}

/** GET /v1/agents */
async function handleListAgents(env) {
  const ensureUiUx = (agents) => {
    const have = new Set(agents.map((a) => a.role));
    if (!have.has('ui')) {
      agents.push({
        role: 'ui',
        name: 'UI / UX Director',
        description: 'Game UI kits, HUDs, radials, hotkeys for ui.grudge-studio.com',
        model: DEFAULT_GEMINI_MODEL,
        escalates_to_vps: false,
        enabled: true,
        endpoint: '/v1/agents/ui/chat',
        alias: '/v1/ui/chat',
      });
    }
    if (!have.has('ux')) {
      agents.push({
        role: 'ux',
        name: 'UX Flow Expert',
        description: 'Auth handoffs, editor flows, fleet SSO UX',
        model: DEFAULT_GEMINI_MODEL,
        escalates_to_vps: false,
        enabled: true,
        endpoint: '/v1/agents/ux/chat',
        alias: '/v1/ux/chat',
      });
    }
    agents.sort((a, b) => String(a.role).localeCompare(String(b.role)));
    return agents;
  };

  try {
    const { results } = await env.DB.prepare(
      'SELECT role, display_name, description, model, escalate_to_vps, enabled FROM agent_roles ORDER BY role'
    ).all();

    const agents = ensureUiUx(
      results.map((r) => ({
        role: r.role,
        name: r.display_name,
        description: r.description,
        model: r.model,
        escalates_to_vps: !!r.escalate_to_vps && isVpsEnabled(env),
        enabled: !!r.enabled,
        endpoint: `/v1/agents/${r.role}/chat`,
      })),
    );

    return json({
      agents,
      count: agents.length,
    });
  } catch (err) {
    // D1 unavailable — return static fallback
    const roles = [
      'general', 'dev', 'balance', 'lore', 'art', 'mission',
      'companion', 'faction', 'realms', 'ui', 'ux', 'api', '3d',
    ];
    return json({
      agents: ensureUiUx(roles.map((r) => ({ role: r, endpoint: `/v1/agents/${r}/chat`, enabled: true }))),
      count: roles.length,
      note: 'Static fallback — D1 unavailable',
    });
  }
}

/** POST /v1/chat and POST /v1/agents/:role/chat */
async function handleChat(request, env, auth, requestId, role) {
  const start = Date.now();
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { message, messages, model, temperature, max_tokens, maxOutputTokens } = body;

  // Accept either a single message string or a messages array
  let chatMessages;
  if (messages && Array.isArray(messages)) {
    chatMessages = messages;
  } else if (message) {
    chatMessages = [{ role: 'user', content: message }];
  } else {
    return json({ error: 'Provide "message" (string) or "messages" (array)' }, 400);
  }

  // Get role config from D1
  let roleConfig = null;
  try {
    roleConfig = await env.DB.prepare(
      'SELECT * FROM agent_roles WHERE role = ? AND enabled = 1'
    ).bind(role).first();
  } catch {
    // D1 unavailable — use inline defaults
  }

  if (!roleConfig) {
    // Inline fallback for known roles (D1 seed lag / cold deploy)
    roleConfig = inlineRoleFallback(role);
  }

  const useModel = model || roleConfig.model;
  const useTemp = temperature ?? roleConfig.temperature;
  const useMaxTokens = maxOutputTokens ?? max_tokens ?? roleConfig.max_tokens;

  // Build full messages array with system prompt (for @cf models and VPS fallback)
  const fullMessages = [
    { role: 'system', content: roleConfig.system_prompt },
    ...chatMessages.filter((m) => m.role !== 'system'),
  ];

  // ── Escalation check: if role requires VPS and VPS is enabled ──
  if (roleConfig.escalate_to_vps && isVpsEnabled(env)) {
    const vpsResult = await escalateToVps(env, role, fullMessages, useTemp, useMaxTokens, requestId);
    const latency = Date.now() - start;
    await logRequest(env, {
      requestId, apiKeyId: auth.keyId, role, provider: vpsResult.provider,
      model: vpsResult.model, status: vpsResult.error ? 'error' : 'escalated',
      latencyMs: latency, tokensIn: vpsResult.usage?.input, tokensOut: vpsResult.usage?.output,
      error: vpsResult.error,
    });
    if (vpsResult.error) {
      return json({ error: vpsResult.error, provider: 'vps', request_id: requestId }, 502);
    }
    return json({
      response: vpsResult.content,
      provider: vpsResult.provider,
      model: vpsResult.model,
      role,
      usage: vpsResult.usage,
      request_id: requestId,
    });
  }

  // ── Primary: Workers AI (Gemini contents API or @cf messages API) ──
  const chatPayload = {
    ...body,
    messages: chatMessages,
    message,
    temperature: useTemp,
    max_tokens: useMaxTokens,
  };

  async function tryAi(modelId) {
    return runWorkersAi(env, modelId, chatPayload, roleConfig, fullMessages);
  }

  try {
    let aiRun;
    try {
      aiRun = await tryAi(useModel);
    } catch (primaryErr) {
      const fb = env.FALLBACK_AI_MODEL || DEFAULT_CF_MODEL;
      if (isGeminiModel(useModel) && useModel !== fb) {
        aiRun = await tryAi(fb);
        aiRun.fallback = true;
        aiRun.fallback_reason = primaryErr.message;
      } else {
        throw primaryErr;
      }
    }

    const latency = Date.now() - start;
    await logRequest(env, {
      requestId, apiKeyId: auth.keyId, role, provider: aiRun.provider,
      model: aiRun.model, status: 'ok', latencyMs: latency,
    });

    return json({
      response: aiRun.text,
      raw: aiRun.result,
      provider: aiRun.provider,
      model: aiRun.model,
      role,
      fallback: !!aiRun.fallback,
      fallback_reason: aiRun.fallback_reason || undefined,
      request_id: requestId,
    });
  } catch (aiErr) {
    console.warn(`Workers AI failed for ${role}:`, aiErr.message);

    if (isVpsEnabled(env)) {
      const vpsResult = await escalateToVps(env, role, fullMessages, useTemp, useMaxTokens, requestId);
      const latency = Date.now() - start;
      await logRequest(env, {
        requestId, apiKeyId: auth.keyId, role,
        provider: vpsResult.error ? 'fallback' : vpsResult.provider,
        model: vpsResult.model, status: vpsResult.error ? 'error' : 'escalated',
        latencyMs: latency, tokensIn: vpsResult.usage?.input, tokensOut: vpsResult.usage?.output,
        error: vpsResult.error || `workers-ai-failed: ${aiErr.message}`,
      });

      if (!vpsResult.error) {
        return json({
          response: vpsResult.content,
          provider: vpsResult.provider,
          model: vpsResult.model,
          role,
          fallback: true,
          request_id: requestId,
        });
      }

      return json({
        error: 'All AI providers unavailable',
        details: { workers_ai: aiErr.message, vps: vpsResult.error },
        request_id: requestId,
      }, 503);
    }

    await logRequest(env, {
      requestId, apiKeyId: auth.keyId, role, provider: 'workers-ai',
      model: useModel, status: 'error', latencyMs: Date.now() - start,
      error: aiErr.message,
    });
    return json({
      error: 'AI provider unavailable',
      details: { workers_ai: aiErr.message },
      request_id: requestId,
    }, 503);
  }
}

/** POST /v1/vision — Gemini multimodal analysis */
async function handleVision(request, env, auth, requestId) {
  const start = Date.now();
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const {
    text,
    prompt,
    image,
    imageBase64,
    mimeType = 'image/png',
    model,
    systemInstruction,
    generationConfig,
  } = body;

  const question = text || prompt;
  const b64 = imageBase64 || image?.data || image;
  if (!question || !b64) {
    return json({ error: 'Provide "text" (or "prompt") and "imageBase64" (or "image")' }, 400);
  }

  const useModel = model || DEFAULT_GEMINI_MODEL;

  try {
    const aiRun = await runWorkersAi(env, useModel, {
      contents: [
        {
          role: 'user',
          parts: [
            { text: question },
            { inlineData: { mimeType: image?.mimeType || mimeType, data: b64 } },
          ],
        },
      ],
      systemInstruction,
      generationConfig,
    });

    const latency = Date.now() - start;
    await logRequest(env, {
      requestId, apiKeyId: auth.keyId, role: 'vision', provider: aiRun.provider,
      model: aiRun.model, status: 'ok', latencyMs: latency,
    });

    return json({
      response: aiRun.text,
      provider: aiRun.provider,
      model: aiRun.model,
      request_id: requestId,
    });
  } catch (err) {
    await logRequest(env, {
      requestId, apiKeyId: auth.keyId, role: 'vision', provider: 'workers-ai-gemini',
      model: useModel, status: 'error', latencyMs: Date.now() - start, error: err.message,
    });
    return json({ error: 'Vision analysis failed', details: err.message, request_id: requestId }, 502);
  }
}

/** POST /v1/image/generate */
async function handleImageGenerate(request, env, auth, requestId) {
  const start = Date.now();
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { prompt, num_steps, guidance } = body;
  if (!prompt) return json({ error: '"prompt" is required' }, 400);

  try {
    const result = await env.AI.run('@cf/stabilityai/stable-diffusion-xl-base-1.0', {
      prompt,
      num_steps: num_steps || 20,
      guidance: guidance || 7.5,
    });

    const latency = Date.now() - start;
    await logRequest(env, {
      requestId, apiKeyId: auth.keyId, role: 'image', provider: 'workers-ai',
      model: '@cf/stabilityai/stable-diffusion-xl-base-1.0', status: 'ok', latencyMs: latency,
    });

    // Result is a ReadableStream of PNG bytes
    return new Response(result, {
      headers: {
        'Content-Type': 'image/png',
        'X-Request-Id': requestId,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    await logRequest(env, {
      requestId, apiKeyId: auth.keyId, role: 'image', provider: 'workers-ai',
      model: '@cf/stabilityai/stable-diffusion-xl-base-1.0', status: 'error',
      latencyMs: Date.now() - start, error: err.message,
    });
    return json({ error: 'Image generation failed', details: err.message, request_id: requestId }, 502);
  }
}

/** POST /v1/embed */
async function handleEmbed(request, env, auth, requestId) {
  const start = Date.now();
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { text, texts } = body;
  const input = texts || (text ? [text] : null);
  if (!input || input.length === 0) return json({ error: '"text" (string) or "texts" (array) is required' }, 400);
  if (input.length > 100) return json({ error: 'Max 100 texts per request' }, 400);

  try {
    const result = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
      text: input,
    });

    const latency = Date.now() - start;
    await logRequest(env, {
      requestId, apiKeyId: auth.keyId, role: 'embed', provider: 'workers-ai',
      model: '@cf/baai/bge-base-en-v1.5', status: 'ok', latencyMs: latency,
    });

    return json({
      embeddings: result.data,
      model: '@cf/baai/bge-base-en-v1.5',
      count: input.length,
      request_id: requestId,
    });
  } catch (err) {
    await logRequest(env, {
      requestId, apiKeyId: auth.keyId, role: 'embed', provider: 'workers-ai',
      model: '@cf/baai/bge-base-en-v1.5', status: 'error',
      latencyMs: Date.now() - start, error: err.message,
    });
    return json({ error: 'Embedding failed', details: err.message, request_id: requestId }, 502);
  }
}


// ════════════════════════════════════════════════════════════════
//  VPS Escalation (circuit breaker)
// ════════════════════════════════════════════════════════════════

const VPS_ROLE_MAP = {
  general: '/api/chat',
  dev:     '/ai/dev/review',
  balance: '/ai/balance/analyze',
  lore:    '/ai/lore/generate',
  art:     '/ai/art/prompt',
  mission: '/ai/mission/generate',
  companion: '/ai/companion/interact',
  faction: '/ai/faction/intel',
};

function isVpsEnabled(env) {
  const flag = String(env.VPS_ENABLED ?? 'false').toLowerCase();
  if (flag === 'false' || flag === '0' || flag === 'off' || flag === 'no') return false;
  return !!(env.VPS_AI_AGENT_URL && String(env.VPS_AI_AGENT_URL).trim());
}

async function getVpsHealthStatus(env) {
  if (!isVpsEnabled(env)) return 'disabled';
  try {
    const resp = await fetch(`${env.VPS_AI_AGENT_URL}/health`, { signal: AbortSignal.timeout(5000) });
    return resp.ok ? 'healthy' : `error-${resp.status}`;
  } catch {
    return 'unreachable';
  }
}

async function escalateToVps(env, role, messages, temperature, maxTokens, requestId) {
  if (!isVpsEnabled(env)) {
    return { error: 'VPS escalation disabled' };
  }

  const vpsUrl = env.VPS_AI_AGENT_URL;
  const internalKey = env.VPS_INTERNAL_KEY;

  // For general chat, use the simple /api/chat endpoint
  const endpoint = VPS_ROLE_MAP[role] || '/api/chat';
  const isAiRoute = endpoint.startsWith('/ai/');

  try {
    // Build request body based on endpoint type
    let body;
    const userMessage = messages.filter(m => m.role === 'user').pop()?.content || '';

    if (isAiRoute) {
      // VPS ai-agent routes expect role-specific payloads
      body = JSON.stringify({
        messages,
        content: userMessage,
        description: userMessage,
        temperature,
        maxTokens,
      });
    } else {
      body = JSON.stringify({
        message: userMessage,
        model: 'auto',
        temperature,
      });
    }

    const resp = await fetch(`${vpsUrl}${endpoint}`, {
      method: endpoint === '/ai/faction/intel' ? 'GET' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': internalKey || '',
        'X-Request-Id': requestId,
      },
      body: endpoint === '/ai/faction/intel' ? undefined : body,
      signal: AbortSignal.timeout(15000),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => 'unknown');
      return { error: `VPS returned ${resp.status}: ${errText}` };
    }

    const data = await resp.json();
    return {
      content: data.data?.content || data.response || data.raw || JSON.stringify(data),
      provider: `vps-${data.provider || 'unknown'}`,
      model: data.model || 'unknown',
      usage: data.usage || {},
    };
  } catch (err) {
    return { error: `VPS unreachable: ${err.message}` };
  }
}


// ════════════════════════════════════════════════════════════════
//  Admin Handlers
// ════════════════════════════════════════════════════════════════

/** GET /v1/admin/usage?hours=24&role=dev */
async function handleAdminUsage(url, env) {
  const hours = parseInt(url.searchParams.get('hours') || '24', 10);
  const role = url.searchParams.get('role');
  const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();

  try {
    let sql = `SELECT
      provider,
      role,
      status,
      COUNT(*) as count,
      AVG(latency_ms) as avg_latency_ms,
      SUM(tokens_in) as total_tokens_in,
      SUM(tokens_out) as total_tokens_out
    FROM request_logs
    WHERE created_at >= ?`;
    const params = [since];

    if (role) {
      sql += ' AND role = ?';
      params.push(role);
    }

    sql += ' GROUP BY provider, role, status ORDER BY count DESC';

    const { results } = await env.DB.prepare(sql).bind(...params).all();

    // Total counts
    const totalResult = await env.DB.prepare(
      'SELECT COUNT(*) as total FROM request_logs WHERE created_at >= ?'
    ).bind(since).first();

    return json({
      period_hours: hours,
      total_requests: totalResult?.total || 0,
      breakdown: results,
      since,
    });
  } catch (err) {
    return json({ error: 'Usage query failed', details: err.message }, 500);
  }
}

/** GET /v1/admin/health */
async function handleAdminHealth(env) {
  const byokConfigured = isGeminiByokConfigured(env);
  let geminiByokStatus = byokConfigured ? 'configured' : 'missing (set GEMINI_API_KEY secret)';

  // Check Gemini (BYOK primary when configured, else Workers AI + @cf fallback)
  let workersAiStatus = 'unknown';
  try {
    const test = await runWorkersAi(env, DEFAULT_GEMINI_MODEL, {
      message: 'ping',
      generationConfig: { maxOutputTokens: 8 },
    });
    if (test.provider === 'google-gemini-byok') {
      geminiByokStatus = test.text ? 'healthy' : 'degraded';
      workersAiStatus = 'bypassed (byok active)';
    } else {
      workersAiStatus = test.text ? `healthy via ${test.provider}` : 'degraded';
    }
  } catch (geminiErr) {
    try {
      const fallback = await env.AI.run(DEFAULT_CF_MODEL, {
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 5,
      });
      workersAiStatus = fallback.response ? `cf-fallback-ok (${geminiErr.message})` : 'degraded';
    } catch (err) {
      workersAiStatus = `error: gemini=${geminiErr.message}; cf=${err.message}`;
    }
  }

  const vpsStatus = await getVpsHealthStatus(env);

  // Check D1
  let d1Status = 'unknown';
  try {
    await env.DB.prepare('SELECT 1').first();
    d1Status = 'healthy';
  } catch (err) {
    d1Status = `error: ${err.message}`;
  }

  // Check KV
  let kvStatus = 'unknown';
  try {
    await env.KV.put('health:check', 'ok', { expirationTtl: 60 });
    kvStatus = 'healthy';
  } catch (err) {
    kvStatus = `error: ${err.message}`;
  }

  return json({
    gemini_byok: geminiByokStatus,
    workers_ai: workersAiStatus,
    vps_ai_agent: vpsStatus,
    d1: d1Status,
    kv: kvStatus,
    timestamp: new Date().toISOString(),
  });
}

/** GET /v1/admin/config */
async function handleAdminConfig(env) {
  try {
    const { results } = await env.DB.prepare('SELECT * FROM agent_roles ORDER BY role').all();
    return json({ roles: results });
  } catch (err) {
    return json({ error: 'Config query failed', details: err.message }, 500);
  }
}

/** PUT /v1/admin/config/:role */
async function handleAdminUpdateConfig(request, env, role) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { system_prompt, model, temperature, max_tokens, escalate_to_vps, enabled } = body;

  try {
    // Check role exists
    const existing = await env.DB.prepare('SELECT role FROM agent_roles WHERE role = ?').bind(role).first();
    if (!existing) {
      return json({ error: `Role "${role}" not found` }, 404);
    }

    // Build dynamic update
    const updates = [];
    const params = [];

    if (system_prompt !== undefined) { updates.push('system_prompt = ?'); params.push(system_prompt); }
    if (model !== undefined)         { updates.push('model = ?'); params.push(model); }
    if (temperature !== undefined)   { updates.push('temperature = ?'); params.push(temperature); }
    if (max_tokens !== undefined)    { updates.push('max_tokens = ?'); params.push(max_tokens); }
    if (escalate_to_vps !== undefined) { updates.push('escalate_to_vps = ?'); params.push(escalate_to_vps ? 1 : 0); }
    if (enabled !== undefined)       { updates.push('enabled = ?'); params.push(enabled ? 1 : 0); }

    if (updates.length === 0) {
      return json({ error: 'No fields to update' }, 400);
    }

    updates.push("updated_at = datetime('now')");
    params.push(role);

    await env.DB.prepare(
      `UPDATE agent_roles SET ${updates.join(', ')} WHERE role = ?`
    ).bind(...params).run();

    const updated = await env.DB.prepare('SELECT * FROM agent_roles WHERE role = ?').bind(role).first();
    return json({ updated: true, role: updated });
  } catch (err) {
    return json({ error: 'Config update failed', details: err.message }, 500);
  }
}


// ════════════════════════════════════════════════════════════════
//  D1 Logging (fire and forget)
// ════════════════════════════════════════════════════════════════

async function logRequest(env, { requestId, apiKeyId, role, provider, model, status, latencyMs, tokensIn, tokensOut, error }) {
  try {
    await env.DB.prepare(
      `INSERT INTO request_logs (request_id, api_key_id, role, provider, model, status, latency_ms, tokens_in, tokens_out, error)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(requestId, apiKeyId || null, role || null, provider, model || null, status, latencyMs || null, tokensIn || null, tokensOut || null, error || null).run();
  } catch (err) {
    console.warn('Failed to log request:', err.message);
  }
}


// ════════════════════════════════════════════════════════════════
//  UI proxy (GRUDA Agent on Vercel)
// ════════════════════════════════════════════════════════════════

async function proxyToUi(request, env, origin) {
  const uiOrigin = (env.UI_ORIGIN || 'https://grudge-agent.vercel.app').replace(/\/$/, '');
  const src = new URL(request.url);
  const target = new URL(src.pathname + src.search, uiOrigin + '/');

  const headers = new Headers(request.headers);
  headers.set('Host', new URL(uiOrigin).host);
  headers.set('X-Forwarded-Host', src.host);
  headers.set('X-Forwarded-Proto', src.protocol.replace(':', ''));

  const init = {
    method: request.method,
    headers,
    redirect: 'manual',
  };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
  }

  try {
    const upstream = await fetch(target.toString(), init);
    const respHeaders = new Headers(upstream.headers);
    respHeaders.delete('content-security-policy');
    return corsResponse(new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: respHeaders,
    }), origin);
  } catch (err) {
    return corsResponse(json({
      error: 'AI Hub UI unavailable',
      details: err.message,
      ui_origin: uiOrigin,
    }, 502), origin);
  }
}

// ════════════════════════════════════════════════════════════════
//  Helpers
// ════════════════════════════════════════════════════════════════

const ALLOWED_ORIGINS = [
  'https://grudgewarlords.com',
  'https://www.grudgewarlords.com',
  'https://grudge-studio.com',
  'https://grudgestudio.com',
  'https://dash.grudge-studio.com',
  'https://ui.grudge-studio.com',
  'https://ai.grudge-studio.com',
  'https://id.grudge-studio.com',
  'https://open.grudge-studio.com',
  'https://character.grudge-studio.com',
  'https://forge.grudge-studio.com',
  'https://threejs-player-and-grass.vercel.app',
  'https://grudge-ui-editor.vercel.app',
  'https://gdevelop-assistant.vercel.app',
  'https://warlord-crafting-suite.vercel.app',
  'https://grudge-engine-web.vercel.app',
  'https://gruda-wars.vercel.app',
  'https://nexus-nemesis-game.vercel.app',
  'https://grudge-angeler.vercel.app',
  'https://grudge-rts.vercel.app',
  'https://grudgecontrol.vercel.app',
  'https://app.puter.com',
  'https://molochdagod.github.io',
];

/** D1-offline role defaults (must stay in sync with migrations/003_ui_ux_agent.sql). */
function inlineRoleFallback(role) {
  const UI_PROMPT = `You are the Grudge Studio UI/UX Director for game interfaces (ui.grudge-studio.com HYDRA + fleet HUDs).
Tokens: gold #c9950a, obsidian panels, Cinzel + JetBrains Mono. Themes: fantasy|cyberpunk|fps|rpg.
When generating UI, JSON only: type uikit_patch | radial | hotkeys | panel. Prefer existing EquipmentManager, Puter KV grudge:{id}:ui-*, fleet auth. No parallel systems.`;
  const UX_PROMPT = `You are the Grudge Studio UX Flow Expert. Auth: id.grudge-studio.com popup + grudge_token → session JWT → Puter link. Preserve editor state. Output short checklists and empty/error/loading states.`;
  const REALMS_PROMPT = `You are the Grudge Studio Realms deployment operator for Mine-Loader + Open (open.grudge-studio.com).
Fleet: SPA mine-loader.vercel.app · edge mine.grudge-studio.com · API mine-loader-api-production.up.railway.app (1 replica + Postgres).
Open open.grudge-studio.com rewrites blocks/worlds/definitions to Mine-Loader; characters to grudge-api Railway.
Assets assets.grudge-studio.com · D1 grudge-assets-db · seed-deployments v4 + voxel map chunks (1 block=1m).
Checklist: healthz, /api/blocks, Railway single replica, Vercel prod aliases, CORS for open + gameopen, no Replit, Mine-Loader is sole world authority.
Be concise and command-oriented.`;

  if (role === 'ui') {
    return {
      role: 'ui',
      system_prompt: UI_PROMPT,
      model: DEFAULT_GEMINI_MODEL,
      temperature: 0.45,
      max_tokens: 2048,
      escalate_to_vps: 0,
    };
  }
  if (role === 'ux') {
    return {
      role: 'ux',
      system_prompt: UX_PROMPT,
      model: DEFAULT_GEMINI_MODEL,
      temperature: 0.4,
      max_tokens: 1536,
      escalate_to_vps: 0,
    };
  }
  if (role === 'realms') {
    return {
      role: 'realms',
      system_prompt: REALMS_PROMPT,
      model: DEFAULT_GEMINI_MODEL,
      temperature: 0.35,
      max_tokens: 2048,
      escalate_to_vps: 0,
    };
  }
  return {
    role,
    system_prompt: `You are the GRUDA Legion AI assistant for Grudge Studio. Role: ${role}.`,
    model: DEFAULT_GEMINI_MODEL,
    temperature: 0.7,
    max_tokens: 1024,
    escalate_to_vps: 0,
  };
}

function corsResponse(response, origin) {
  const headers = new Headers(response.headers);

  // Allow any *.vercel.app or *.grudge-studio.com or explicit origins.
  // No Origin (direct browser navigation / same-origin) → reflect ai hub origin.
  const allowed = !origin
    || ALLOWED_ORIGINS.includes(origin)
    || origin.endsWith('.vercel.app')
    || origin.endsWith('.grudge-studio.com')
    || origin.endsWith('.grudgestudio.com')
    || origin.endsWith('.puter.site')
    || origin.endsWith('.puter.work');

  headers.set('Access-Control-Allow-Origin', allowed ? (origin || '*') : ALLOWED_ORIGINS[0]);
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-Id');
  headers.set('Access-Control-Max-Age', '86400');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
