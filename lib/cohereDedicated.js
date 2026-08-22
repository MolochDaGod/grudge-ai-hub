/**
 * Cohere dedicated cluster (North / private deploy).
 * ID: grudge-s010rs
 * URL: https://api.grudge-s010rs.cloud.cohere.com
 * Fallback: https://api.cohere.com until dedicated DNS is live.
 */
const PLACEHOLDER = /not_yet_configured|your[_-]?api[_-]?key|changeme|placeholder/i
export const COHERE_DEFAULT_BASE = 'https://api.grudge-s010rs.cloud.cohere.com'
export const COHERE_PUBLIC_BASE = 'https://api.cohere.com'
export const COHERE_DEPLOYMENT_ID = 'grudge-s010rs'
export const COHERE_CHAT_MODEL = 'command-r'
export const COHERE_EMBED_MODEL = 'embed-english-v3.0'

export function getCohereKey(env) {
  const k = env?.COHERE_API_KEY
  if (!k || PLACEHOLDER.test(k)) return null
  return k.trim()
}

export function getCohereBase(env) {
  const b = (env?.COHERE_BASE_URL || COHERE_DEFAULT_BASE).replace(/\/$/, '')
  return b
}

export function isCohereConfigured(env) {
  return !!getCohereKey(env)
}

function headers(env) {
  return {
    Authorization: `Bearer ${getCohereKey(env)}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Client-Name': 'grudge-ai-hub',
  }
}

async function fetchCohere(env, path, init = {}) {
  const bases = [getCohereBase(env)]
  if (getCohereBase(env) !== COHERE_PUBLIC_BASE) bases.push(COHERE_PUBLIC_BASE)
  let lastErr
  for (const base of bases) {
    try {
      const resp = await fetch(base + path, {
        ...init,
        headers: { ...headers(env), ...(init.headers || {}) },
        signal: AbortSignal.timeout(90000),
      })
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        lastErr = new Error(data?.message || data?.error || `Cohere ${resp.status} ${path}`)
        continue
      }
      return { data, base, status: resp.status }
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr || new Error('Cohere unreachable')
}

export async function runCohereChat(env, messages, model) {
  if (!isCohereConfigured(env)) return null
  const useModel = model || env.COHERE_CHAT_MODEL || COHERE_CHAT_MODEL
  const msgs = (messages || []).map((m) => ({
    role: m.role === 'assistant' || m.role === 'CHATBOT' ? 'assistant' : m.role === 'system' ? 'system' : 'user',
    content: typeof m.content === 'string' ? m.content : String(m.content || ''),
  }))
  const { data, base } = await fetchCohere(env, '/v2/chat', {
    method: 'POST',
    body: JSON.stringify({ model: useModel, messages: msgs, stream: false }),
  })
  const text =
    data?.message?.content?.[0]?.text ||
    data?.text ||
    data?.generations?.[0]?.text ||
    ''
  return {
    result: data,
    text,
    model: useModel,
    provider: 'cohere-dedicated',
    endpoint: base,
    deployment: env.COHERE_DEPLOYMENT_ID || COHERE_DEPLOYMENT_ID,
  }
}

export async function runCohereEmbed(env, texts, inputType = 'search_document') {
  if (!isCohereConfigured(env)) return null
  const model = env.COHERE_EMBED_MODEL || COHERE_EMBED_MODEL
  const { data, base } = await fetchCohere(env, '/v2/embed', {
    method: 'POST',
    body: JSON.stringify({
      model,
      texts: Array.isArray(texts) ? texts : [texts],
      input_type: inputType,
      embedding_types: ['float'],
    }),
  })
  return { embeddings: data.embeddings, model, provider: 'cohere-dedicated', endpoint: base }
}

export async function runCohereRerank(env, query, documents) {
  if (!isCohereConfigured(env)) return null
  const { data, base } = await fetchCohere(env, '/v2/rerank', {
    method: 'POST',
    body: JSON.stringify({
      model: env.COHERE_RERANK_MODEL || 'rerank-english-v3.0',
      query,
      documents,
      top_n: Math.min(10, documents.length),
    }),
  })
  return { results: data.results, provider: 'cohere-dedicated', endpoint: base }
}
