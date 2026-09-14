/**
 * Light ElevenLabs TTS for Legion — bark/VO only, not a second audio stack.
 * Production SFX/VO bake stays gameopen danger-ai Worker → R2.
 * This path: JWT chat surfaces, short text, KV cache, tight RPM/daily.
 */
const PLACEHOLDER = /not_yet_configured|your[_-]?api[_-]?key|changeme|placeholder/i
export const TTS_MAX_CHARS = 280
export const TTS_RPM = 4
export const TTS_DAILY = 20
export const TTS_MODEL = 'eleven_multilingual_v2'
export const TTS_DEFAULT_VOICE = 'JBFqnCBsd6RMkjVDRZzb'

export function getElevenKey(env) {
  const k = env?.ELEVEN_LABS_API || env?.ELEVENLABS_API_KEY
  if (!k || PLACEHOLDER.test(k)) return null
  return k.trim()
}

export function isElevenConfigured(env) {
  return !!getElevenKey(env)
}

export function clipTtsText(raw) {
  const t = String(raw || '').replace(/\s+/g, ' ').trim()
  if (!t) return ''
  if (t.length <= TTS_MAX_CHARS) return t
  return t.slice(0, TTS_MAX_CHARS)
}

async function sha256hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function ttsCacheKey(text, voiceId, model) {
  return 'tts:' + (await sha256hex(`${voiceId}|${model}|${text}`))
}

/**
 * Returns { audio_base64, format, cached, chars } or throws.
 */
export async function runElevenTts(env, { text, voiceId }) {
  const key = getElevenKey(env)
  if (!key) throw new Error('ElevenLabs not configured')
  const clipped = clipTtsText(text)
  if (!clipped) throw new Error('empty tts text')
  const voice = voiceId || env.ELEVEN_VOICE_ID || TTS_DEFAULT_VOICE
  const model = env.ELEVEN_TTS_MODEL || TTS_MODEL
  const cacheId = await ttsCacheKey(clipped, voice, model)

  if (env.KV) {
    const hit = await env.KV.get(cacheId)
    if (hit) {
      return { audio_base64: hit, format: 'mp3', cached: true, chars: clipped.length, voice, model }
    }
  }

  const resp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
    method: 'POST',
    headers: {
      'xi-api-key': key,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text: clipped,
      model_id: model,
      voice_settings: { stability: 0.45, similarity_boost: 0.7 },
    }),
    signal: AbortSignal.timeout(30000),
  })
  if (!resp.ok) {
    const errText = await resp.text().catch(() => '')
    throw new Error(errText.slice(0, 180) || `ElevenLabs ${resp.status}`)
  }
  const buf = await resp.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  const audio_base64 = btoa(bin)
  if (env.KV) {
    env.KV.put(cacheId, audio_base64, { expirationTtl: 86400 }).catch(() => {})
  }
  return { audio_base64, format: 'mp3', cached: false, chars: clipped.length, voice, model }
}
