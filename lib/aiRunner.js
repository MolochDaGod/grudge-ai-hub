/**
 * Unified Workers AI runner for Grudge Studio.
 * Supports @cf/* models (messages API) and google/* Gemini models (contents API).
 */

export const DEFAULT_GEMINI_MODEL = 'google/gemini-3.5-flash';
/** Best free Workers AI default (binding) — fast path */
export const DEFAULT_CF_MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';
/** Stronger free Workers AI when primary fails or quality needed */
export const STRONG_CF_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
/** Multimodal scout model (text+vision capable) */
export const SCOUT_CF_MODEL = '@cf/meta/llama-4-scout-17b-16e-instruct';
/** Groq free-tier defaults (when GROQ_API_KEY secret set) */
export const DEFAULT_GROQ_MODEL = 'llama-3.3-70b-versatile';
export const FAST_GROQ_MODEL = 'llama-3.1-8b-instant';

const BALANCE_ERROR = /insufficient balance|use byok/i;
const PLACEHOLDER_KEY = /not_yet_configured|your[_-]?api[_-]?key|changeme|placeholder/i;
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export function isGeminiModel(model) {
  return typeof model === 'string' && model.startsWith('google/');
}

/** True when a real Google AI Studio / Gemini API key is configured on the Worker. */
export function isGeminiByokConfigured(env) {
  return !!getGeminiApiKey(env);
}

export function getGeminiApiKey(env) {
  const key = env?.GEMINI_API_KEY || env?.GOOGLE_API_KEY;
  if (!key || PLACEHOLDER_KEY.test(key)) return null;
  return key.trim();
}

/** Workers AI model id → Google Generative Language API model id */
export function workersModelToGoogleApi(model) {
  if (typeof model !== 'string') return DEFAULT_GEMINI_MODEL.replace('google/', '');
  if (model.startsWith('google/')) return model.slice('google/'.length);
  return model;
}

export function normalizeModel(model, env) {
  return model || env?.DEFAULT_AI_MODEL || DEFAULT_GEMINI_MODEL;
}

/** OpenAI-style messages → Gemini contents + optional systemInstruction */
export function messagesToGemini(messages = [], systemInstruction) {
  const systemParts = [];
  const contents = [];

  for (const msg of messages) {
    if (!msg?.content) continue;
    if (msg.role === 'system') {
      systemParts.push({ text: String(msg.content) });
      continue;
    }
    const role = msg.role === 'assistant' ? 'model' : 'user';
    const parts = [{ text: String(msg.content) }];
    if (Array.isArray(msg.images)) {
      for (const img of msg.images) {
        if (img?.data) {
          parts.push({
            inlineData: {
              mimeType: img.mimeType || 'image/png',
              data: img.data,
            },
          });
        }
      }
    }
    contents.push({ role, parts });
  }

  const out = { contents };
  const sys = systemInstruction || (systemParts.length ? { parts: systemParts } : null);
  if (sys) out.systemInstruction = sys;
  return out;
}

/** Build Gemini payload from hub request body */
export function buildGeminiRunOptions(body = {}, roleConfig = {}) {
  const {
    contents,
    messages,
    message,
    images,
    systemInstruction,
    generationConfig,
    temperature,
    max_tokens,
    maxOutputTokens,
  } = body;

  if (contents && Array.isArray(contents)) {
    const opts = { contents };
    if (systemInstruction) opts.systemInstruction = systemInstruction;
    if (generationConfig) opts.generationConfig = generationConfig;
    return opts;
  }

  let chatMessages = messages;
  if (!chatMessages && message) {
    chatMessages = [{ role: 'user', content: message }];
  }
  if (!chatMessages?.length) return null;

  if (roleConfig.system_prompt) {
    chatMessages = [
      { role: 'system', content: roleConfig.system_prompt },
      ...chatMessages.filter((m) => m.role !== 'system'),
    ];
  }

  const lastUser = [...chatMessages].reverse().find((m) => m.role === 'user');
  if (images?.length && lastUser) {
    lastUser.images = images;
  }

  const gemini = messagesToGemini(chatMessages, systemInstruction);

  const gen = { ...(generationConfig || {}) };
  if (temperature !== undefined) gen.temperature = temperature;
  const maxTok = maxOutputTokens ?? max_tokens ?? roleConfig.max_tokens;
  if (maxTok !== undefined) gen.maxOutputTokens = maxTok;
  if (Object.keys(gen).length) gemini.generationConfig = gen;

  return gemini;
}

export function buildCfRunOptions(body = {}, roleConfig = {}, fullMessages) {
  const messages = fullMessages || body.messages;
  const useTemp = body.temperature ?? roleConfig.temperature ?? 0.7;
  const useMaxTokens = body.max_tokens ?? body.maxOutputTokens ?? roleConfig.max_tokens ?? 1024;
  return {
    messages,
    temperature: useTemp,
    max_tokens: useMaxTokens,
  };
}

/** Extract text from Workers AI Gemini, OpenAI-compat, or @cf response */
export function extractAiText(result) {
  if (!result) return '';
  if (typeof result === 'string') {
    try {
      const parsed = JSON.parse(result);
      return extractAiText(parsed);
    } catch {
      return result;
    }
  }
  if (result.response && typeof result.response === 'string' && !result.response.startsWith('{')) {
    return result.response;
  }

  const choice = result.choices?.[0]?.message;
  if (choice) {
    return choice.content || choice.reasoning_content || '';
  }

  const candidate = result.candidates?.[0];
  if (candidate?.content?.parts) {
    return candidate.content.parts
      .map((p) => p.text || '')
      .filter(Boolean)
      .join('');
  }

  if (result.description) return result.description;
  if (result.text) return result.text;
  if (typeof result.response === 'string') return result.response;
  return JSON.stringify(result);
}

function shouldFallback(err) {
  const msg = err?.message || String(err);
  return (
    BALANCE_ERROR.test(msg) ||
    /deprecated|no such model|not found|capacity|timeout|429|503|502/i.test(msg)
  );
}

function fallbackModel(env) {
  return env.FALLBACK_AI_MODEL || DEFAULT_CF_MODEL;
}

/** Ordered free Workers AI cascade (binding-first — CF best practice vs REST hop). */
export function workersAiCascade(env, primary) {
  const fb = fallbackModel(env);
  const strong = env.STRONG_AI_MODEL || STRONG_CF_MODEL;
  const chain = [primary, strong, fb, DEFAULT_CF_MODEL].filter(Boolean);
  // de-dupe preserving order
  const seen = new Set();
  return chain.filter((m) => {
    if (seen.has(m)) return false;
    seen.add(m);
    return true;
  });
}

export function isGroqConfigured(env) {
  const k = env?.GROQ_API_KEY;
  return !!(k && !PLACEHOLDER_KEY.test(k));
}

/**
 * Groq OpenAI-compat free tier — cheap/fast path for fleet when secret set.
 * Prefer for general chat when Gemini BYOK missing or as mid-waterfall.
 */
export async function runGroq(env, messages, model) {
  if (!isGroqConfigured(env)) return null;
  const useModel = model || env.GROQ_MODEL || DEFAULT_GROQ_MODEL;
  const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GROQ_API_KEY.trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: useModel,
      messages: (messages || []).map((m) => ({
        role: m.role === 'model' ? 'assistant' : m.role,
        content: typeof m.content === 'string' ? m.content : String(m.content || ''),
      })),
      temperature: 0.7,
      max_tokens: 2048,
    }),
    signal: AbortSignal.timeout(90000),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(data?.error?.message || `Groq HTTP ${resp.status}`);
  }
  const text =
    data.choices?.[0]?.message?.content ||
    data.choices?.[0]?.message?.reasoning_content ||
    '';
  return {
    result: data,
    text,
    model: useModel,
    provider: 'groq',
    tokens: data.usage?.total_tokens,
  };
}

async function runWorkersAiRest(env, model, payload) {
  const accountId = env.CLOUDFLARE_ACCOUNT_ID || 'ee475864561b02d4588180b8b9acf694';
  const token = env.WORKERS_AI_USER_TOKEN;
  if (!token) throw new Error('WORKERS_AI_USER_TOKEN not configured');

  const encodedModel = encodeURIComponent(model);
  const resp = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1/chat/completions`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, ...payload }),
      signal: AbortSignal.timeout(120000),
    },
  );

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || !data.success) {
    const msg = data?.errors?.[0]?.message || `REST AI ${resp.status}`;
    throw new Error(msg);
  }

  const text = data.result?.response
    || data.result?.choices?.[0]?.message?.content
    || extractAiText(data.result);
  return { result: data.result, text, model, provider: 'workers-ai-rest' };
}

async function runGeminiByok(env, useModel, body, roleConfig) {
  const apiKey = getGeminiApiKey(env);
  if (!apiKey) return null;

  const googleModel = workersModelToGoogleApi(useModel);
  const geminiOpts = buildGeminiRunOptions(body, roleConfig);
  if (!geminiOpts?.contents?.length) {
    throw new Error('Gemini BYOK requires contents or messages');
  }

  const payload = {
    contents: geminiOpts.contents,
  };
  if (geminiOpts.systemInstruction) payload.systemInstruction = geminiOpts.systemInstruction;
  if (geminiOpts.generationConfig) payload.generationConfig = geminiOpts.generationConfig;

  const url = `${GEMINI_API_BASE}/models/${encodeURIComponent(googleModel)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(120000),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const msg = data?.error?.message || `Gemini BYOK HTTP ${resp.status}`;
    throw new Error(msg);
  }

  const text = extractAiText(data);
  return {
    result: data,
    text,
    model: useModel,
    google_model: googleModel,
    provider: 'google-gemini-byok',
  };
}

async function runBinding(env, useModel, body, roleConfig, fullMessages) {
  if (isGeminiModel(useModel)) {
    const geminiOpts = buildGeminiRunOptions(body, roleConfig);
    if (!geminiOpts?.contents?.length) {
      throw new Error('Gemini models require contents or messages');
    }
    const result = await env.AI.run(useModel, geminiOpts);
    return { result, text: extractAiText(result), model: useModel, provider: 'workers-ai-gemini' };
  }

  const cfOpts = buildCfRunOptions(body, roleConfig, fullMessages);
  const result = await env.AI.run(useModel, cfOpts);
  return { result, text: extractAiText(result), model: useModel, provider: 'workers-ai' };
}

/**
 * Best-practice Grudge LLM waterfall (binding-first CF Workers AI):
 *  1) Gemini BYOK (google/* when key set)
 *  2) Groq free (GROQ_API_KEY) for chat-like payloads
 *  3) Workers AI env.AI binding cascade (primary → 70b → 8b-fast)
 *  4) Workers AI REST only if WORKERS_AI_USER_TOKEN (avoid when binding works)
 */
export async function runWorkersAi(env, model, body = {}, roleConfig = {}, fullMessages) {
  const useModel = normalizeModel(model, env);
  const errors = [];

  // 1) BYOK Gemini — bill Google, skip CF AI Gateway balance
  if (isGeminiModel(useModel) && isGeminiByokConfigured(env)) {
    try {
      const byok = await runGeminiByok(env, useModel, body, roleConfig);
      if (byok?.text) return byok;
    } catch (byokErr) {
      errors.push(`gemini-byok: ${byokErr.message}`);
      console.warn('Gemini BYOK failed, continuing waterfall:', byokErr.message);
    }
  }

  // 2) Groq free tier (optional secret) — excellent latency for tool/chat
  if (isGroqConfigured(env) && (body.prefer === 'groq' || body.prefer === 'auto' || !isGeminiModel(useModel) || errors.length)) {
    try {
      const msgs =
        fullMessages ||
        body.messages ||
        (body.message ? [{ role: 'user', content: body.message }] : null);
      if (msgs?.length) {
        const groqModel =
          body.prefer === 'groq' || String(useModel).includes('llama')
            ? body.groq_model || DEFAULT_GROQ_MODEL
            : FAST_GROQ_MODEL;
        const g = await runGroq(env, msgs, groqModel);
        if (g?.text) {
          return {
            ...g,
            fallback: errors.length > 0,
            fallback_reason: errors[0],
            path: ['groq', ...errors],
          };
        }
      }
    } catch (groqErr) {
      errors.push(`groq: ${groqErr.message}`);
      console.warn('Groq failed:', groqErr.message);
    }
  }

  // 3) Workers AI binding cascade (preferred over REST hop)
  const cascade = isGeminiModel(useModel)
    ? workersAiCascade(env, fallbackModel(env)) // gemini already tried BYOK — use CF free models
    : workersAiCascade(env, useModel);

  let lastErr = null;
  for (let i = 0; i < cascade.length; i++) {
    const mid = cascade[i];
    try {
      // Skip google/* on binding if BYOK already failed (gateway may 402)
      if (isGeminiModel(mid) && errors.some((e) => e.startsWith('gemini'))) continue;
      const run = await runBinding(env, mid, body, roleConfig, fullMessages);
      if (run?.text) {
        return {
          ...run,
          fallback: i > 0 || errors.length > 0,
          fallback_reason: i > 0 ? `cascade from ${useModel}` : errors[0],
          path: ['workers-ai-binding', mid, ...errors],
        };
      }
    } catch (err) {
      lastErr = err;
      errors.push(`${mid}: ${err.message}`);
      if (!shouldFallback(err) && i === 0 && !isGeminiModel(useModel)) {
        // non-recoverable on primary non-gemini — still try cascade once
      }
    }
  }

  // 4) REST only with token — CF best practice: prefer binding
  if (env.WORKERS_AI_USER_TOKEN) {
    try {
      const restModel = isGeminiModel(useModel) ? fallbackModel(env) : useModel;
      if (isGeminiModel(restModel)) {
        const geminiOpts = buildGeminiRunOptions(body, roleConfig);
        const messages =
          geminiOpts.contents
            ?.filter((c) => c.role === 'user' || c.role === 'model')
            .map((c) => ({
              role: c.role === 'model' ? 'assistant' : 'user',
              content: c.parts?.map((p) => p.text || '').filter(Boolean).join('\n') || '',
            })) || [];
        const rest = await runWorkersAiRest(env, restModel, {
          messages,
          temperature: geminiOpts.generationConfig?.temperature,
          max_tokens: geminiOpts.generationConfig?.maxOutputTokens,
        });
        return { ...rest, fallback: true, path: ['workers-ai-rest', ...errors] };
      }
      const cfOpts = buildCfRunOptions(body, roleConfig, fullMessages);
      const rest = await runWorkersAiRest(env, restModel, {
        messages: cfOpts.messages,
        temperature: cfOpts.temperature,
        max_tokens: cfOpts.max_tokens,
      });
      return { ...rest, fallback: true, path: ['workers-ai-rest', ...errors] };
    } catch (restErr) {
      errors.push(`rest: ${restErr.message}`);
    }
  }

  throw lastErr || new Error(`All LLM providers failed: ${errors.join(' | ')}`);
}