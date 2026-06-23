/**
 * Unified Workers AI runner for Grudge Studio.
 * Supports @cf/* models (messages API) and google/* Gemini models (contents API).
 */

export const DEFAULT_GEMINI_MODEL = 'google/gemini-3.5-flash';
export const DEFAULT_CF_MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';

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
  return BALANCE_ERROR.test(msg) || /deprecated|no such model/i.test(msg);
}

function fallbackModel(env) {
  return env.FALLBACK_AI_MODEL || DEFAULT_CF_MODEL;
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

export async function runWorkersAi(env, model, body = {}, roleConfig = {}, fullMessages) {
  const useModel = normalizeModel(model, env);

  // BYOK: bill Google AI Studio directly — bypasses Cloudflare AI Gateway balance.
  if (isGeminiModel(useModel) && isGeminiByokConfigured(env)) {
    try {
      const byok = await runGeminiByok(env, useModel, body, roleConfig);
      if (byok) return byok;
    } catch (byokErr) {
      console.warn('Gemini BYOK failed, trying Workers AI:', byokErr.message);
    }
  }

  try {
    return await runBinding(env, useModel, body, roleConfig, fullMessages);
  } catch (primaryErr) {
    // Workers AI balance exhausted — retry BYOK if key was added after deploy.
    if (isGeminiModel(useModel) && shouldFallback(primaryErr) && isGeminiByokConfigured(env)) {
      try {
        const byok = await runGeminiByok(env, useModel, body, roleConfig);
        if (byok) return { ...byok, fallback: true, fallback_reason: primaryErr.message };
      } catch (byokErr) {
        console.warn('Gemini BYOK fallback failed:', byokErr.message);
      }
    }
    if (shouldFallback(primaryErr) && useModel !== fallbackModel(env)) {
      try {
        const fb = await runBinding(env, fallbackModel(env), body, roleConfig, fullMessages);
        return { ...fb, fallback: true, fallback_reason: primaryErr.message };
      } catch (fallbackErr) {
        console.warn('Primary+fallback binding failed:', primaryErr.message, fallbackErr.message);
      }
    }

    if (!env.WORKERS_AI_USER_TOKEN) throw primaryErr;

    try {
      if (isGeminiModel(useModel)) {
        const geminiOpts = buildGeminiRunOptions(body, roleConfig);
        const messages = geminiOpts.contents
          ?.filter((c) => c.role === 'user' || c.role === 'model')
          .map((c) => ({
            role: c.role === 'model' ? 'assistant' : 'user',
            content: c.parts?.map((p) => p.text || '').filter(Boolean).join('\n') || '',
          })) || [];
        return runWorkersAiRest(env, useModel, {
          messages,
          temperature: geminiOpts.generationConfig?.temperature,
          max_tokens: geminiOpts.generationConfig?.maxOutputTokens,
        });
      }

      const cfOpts = buildCfRunOptions(body, roleConfig, fullMessages);
      return runWorkersAiRest(env, useModel, {
        messages: cfOpts.messages,
        temperature: cfOpts.temperature,
        max_tokens: cfOpts.max_tokens,
      });
    } catch (restErr) {
      if (shouldFallback(restErr) && useModel !== fallbackModel(env)) {
        try {
          const fb = await runBinding(env, fallbackModel(env), body, roleConfig, fullMessages);
          return { ...fb, fallback: true, fallback_reason: restErr.message };
        } catch (fallbackErr) {
          console.warn('REST+fallback binding failed:', restErr.message, fallbackErr.message);
        }
      }
      throw primaryErr;
    }
  }
}