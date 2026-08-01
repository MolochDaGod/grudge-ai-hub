/**
 * Env bindings for grudge-ai-hub / grudge-legion-ai.
 * Regenerate after wrangler changes:
 *   npx wrangler types --config wrangler.domain.toml
 * Keep this file checked in as the agent/TS contract when full generate is unavailable.
 */

interface Env {
  /** Cloudflare Workers AI binding */
  AI: Ai;
  /** D1 grudge-ai-hub — jobs, agents config, usage */
  DB: D1Database;
  /** KV — rate limits, feature flags, caches */
  KV: KVNamespace;
  /** Public vars */
  ENVIRONMENT: string;
  DEFAULT_AI_MODEL: string;
  FALLBACK_AI_MODEL: string;
  CLOUDFLARE_ACCOUNT_ID: string;
  VPS_ENABLED: string;
  VPS_AI_AGENT_URL: string;
  RATE_LIMIT_RPM: string;
  RATE_LIMIT_RPM_ADMIN: string;
  MAX_PAYLOAD_BYTES: string;
  UI_ORIGIN: string;
  OBSERVATORY_URL?: string;
  /** Secrets — wrangler secret put only */
  OBSERVATORY_KEY?: string;
  GEMINI_API_KEY?: string;
  VPS_INTERNAL_KEY?: string;
  WORKERS_AI_USER_TOKEN?: string;
  JWT_SECRET?: string;
  /** Optional queue producer if attached later */
  AI_EVENTS?: Queue;
}
