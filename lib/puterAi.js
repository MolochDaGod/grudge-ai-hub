/**
 * Puter User-Pays models for Legion (Fable 5.1, Astra 6).
 * Prefer X-Puter-Token (caller pays). Deployer PUTER_AUTH_TOKEN is opt-in
 * and never used for fleet GRUDGE_AI_KEY (poker / same-origin rewrites).
 *
 * OpenAI-compat: https://api.puter.com/puterai/openai/v1
 */
const PLACEHOLDER = /not_yet_configured|your[_-]?api[_-]?key|changeme|placeholder/i
export const PUTER_AI_BASE = 'https://api.puter.com/puterai/openai/v1'
export const PUTER_FABLE = 'claude-fable-5-1'
export const PUTER_ASTRA = 'gpt-6-astra'
export const PUTER_CHAT_MODELS = [
  'claude-fable-5-1',
  'claude-fable-5',
  'claude-opus-5',
  'claude-opus-5-fast',
  'gpt-6-astra',
  'gpt-6-astra-pro',
]
export const CHAT_MAX_MESSAGES = 24
export const CHAT_MAX_CHARS = 16000
export const PUTER_MAX_MESSAGES = 12
export const PUTER_MAX_CHARS = 8000
export const PUTER_MAX_TOKENS = 2048

export function clipMessages(messages, maxMessages = CHAT_MAX_MESSAGES, maxChars = CHAT_MAX_CHARS) {
  const slice = (messages || []).slice(-maxMessages)
  return slice.map((m) => ({
    role: m?.role === 'assistant' ? 'assistant' : m?.role === 'system' ? 'system' : 'user',
    content: String(m?.content ?? '').slice(0, maxChars),
  }))
}

export function isRetiredCohereModel(model) {
  const s = String(model || '').toLowerCase()
  return s.includes('cohere') || s.includes('command-a') || s.includes('command-r')
}

export function getPuterDeployerToken(env) {
  const k = env?.PUTER_AUTH_TOKEN || env?.PUTER_DEPLOYER_TOKEN
  if (!k || PLACEHOLDER.test(k)) return null
  return k.trim()
}

export function isPuterDeployerConfigured(env) {
  return !!getPuterDeployerToken(env)
}

export function isPuterModel(model) {
  const raw = String(model || '').toLowerCase().trim()
  if (!raw) return false
  if (raw === 'puter') return true
  const s = normalizePuterModel(raw)
  return PUTER_CHAT_MODELS.includes(s)
}

export function normalizePuterModel(model) {
  const s = String(model || '').toLowerCase().trim()
  if (!s || s === 'puter' || s === 'auto') return PUTER_FABLE
  if (s === 'astra' || s === 'astra-6' || s === 'gpt-6') return PUTER_ASTRA
  if (s.startsWith('anthropic/')) return s.slice('anthropic/'.length)
  if (s.startsWith('openai/')) return s.slice('openai/'.length)
  return s
}

function modelIds(model) {
  const base = normalizePuterModel(model)
  const ids = [base]
  if (base.startsWith('claude-')) ids.push('anthropic/' + base)
  if (base.startsWith('gpt-')) ids.push('openai/' + base)
  return ids
}

function extractText(data) {
  const msg = data?.choices?.[0]?.message
  if (!msg) return data?.text || ''
  if (typeof msg.content === 'string') return msg.content
  if (Array.isArray(msg.content)) {
    return msg.content
      .map((c) => (typeof c === 'string' ? c : c?.text || c?.content || ''))
      .filter(Boolean)
      .join('\n')
  }
  return msg.text || ''
}

/**
 * @param {string} token Puter auth token (user or deployer)
 */
export async function runPuterChat(token, messages, model) {
  if (!token) return null
  const ids = modelIds(model)
  let lastErr = 'puter failed'
  for (const id of ids) {
    try {
      const resp = await fetch(PUTER_AI_BASE + '/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          model: id,
          messages: clipMessages(messages, PUTER_MAX_MESSAGES, PUTER_MAX_CHARS),
          max_tokens: PUTER_MAX_TOKENS,
          stream: false,
        }),
        signal: AbortSignal.timeout(120000),
      })
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        lastErr = data?.error?.message || data?.message || `Puter ${resp.status}`
        continue
      }
      const text = extractText(data)
      if (!text) {
        lastErr = 'empty puter response'
        continue
      }
      return {
        result: data,
        text,
        model: id,
        provider: 'puter',
        billing: 'puter',
        path: ['puter'],
        fallback: false,
      }
    } catch (e) {
      lastErr = e.message || String(e)
    }
  }
  throw new Error(lastErr)
}
