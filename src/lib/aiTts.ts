import type { SpeakerGender } from './script'

const STORAGE_KEY = 'homens-de-papel:elevenlabs-key'
const KEY_EVENT = 'homens-de-papel:ai-key'

const FALLBACK_VOICES = {
  female: 'EXAVITQu4vr4xnSDxMaL', // Sarah
  male: 'JBFqnCBsd6RMkjVDRZzb', // George
} as const

const cache = new Map<string, string>()
let currentAbort: AbortController | null = null
let resolvedVoices: { female: string; male: string } | null = null

function envKey(): string {
  const value = import.meta.env.VITE_ELEVENLABS_API_KEY
  return typeof value === 'string' ? value.trim() : ''
}

export function getAiTtsKey(): string {
  const fromEnv = envKey()
  if (fromEnv) return fromEnv
  try {
    return localStorage.getItem(STORAGE_KEY)?.trim() ?? ''
  } catch {
    return ''
  }
}

export function hasAiTtsKey(): boolean {
  return getAiTtsKey().length > 0
}

export function hasBuiltInAiTtsKey(): boolean {
  return envKey().length > 0
}

export function setAiTtsKey(key: string) {
  try {
    const next = key.trim()
    if (next) localStorage.setItem(STORAGE_KEY, next)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
  resolvedVoices = null
  window.dispatchEvent(new Event(KEY_EVENT))
}

export function onAiTtsKeyChange(cb: () => void): () => void {
  window.addEventListener(KEY_EVENT, cb)
  return () => window.removeEventListener(KEY_EVENT, cb)
}

export function cancelAiTts() {
  currentAbort?.abort()
  currentAbort = null
}

type ElevenVoice = {
  voice_id: string
  name: string
  labels?: Record<string, string>
}

function voiceBlob(voice: ElevenVoice): string {
  return `${voice.name} ${JSON.stringify(voice.labels ?? {})}`.toLowerCase()
}

function isPortuguese(voice: ElevenVoice): boolean {
  return /portugu|brazil|brasil|pt-br|pt_br|brazilian/.test(voiceBlob(voice))
}

function isFemale(voice: ElevenVoice): boolean {
  const gender = voice.labels?.gender?.toLowerCase()
  if (gender === 'female') return true
  if (gender === 'male') return false
  return /\bfemale\b|feminina|\bwoman\b|mulher/.test(voiceBlob(voice))
}

function isMale(voice: ElevenVoice): boolean {
  if (isFemale(voice)) return false
  const gender = voice.labels?.gender?.toLowerCase()
  if (gender === 'male') return true
  return /\bmale\b|masculin|\bman\b|homem/.test(voiceBlob(voice))
}

async function resolveVoices(signal: AbortSignal): Promise<{ female: string; male: string }> {
  if (resolvedVoices) return resolvedVoices
  const response = await fetch('https://api.elevenlabs.io/v1/voices', {
    headers: { 'xi-api-key': getAiTtsKey() },
    signal,
  })
  if (!response.ok) return FALLBACK_VOICES
  const data = (await response.json()) as { voices?: ElevenVoice[] }
  const voices = data.voices ?? []
  const pt = voices.filter(isPortuguese)
  const pool = pt.length ? pt : voices
  resolvedVoices = {
    female:
      pool.find(isFemale)?.voice_id ??
      voices.find(isFemale)?.voice_id ??
      FALLBACK_VOICES.female,
    male:
      pool.find(isMale)?.voice_id ??
      voices.find(isMale)?.voice_id ??
      FALLBACK_VOICES.male,
  }
  return resolvedVoices
}

async function requestSpeech(
  text: string,
  voiceId: string,
  model: 'eleven_multilingual_v2' | 'eleven_turbo_v2_5',
  signal: AbortSignal,
): Promise<Response> {
  const body: Record<string, unknown> = {
    text,
    model_id: model,
    voice_settings: {
      stability: 0.4,
      similarity_boost: 0.8,
      style: 0.35,
      use_speaker_boost: true,
    },
  }
  if (model === 'eleven_turbo_v2_5') body.language_code = 'pt'

  return fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': getAiTtsKey(),
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify(body),
    signal,
  })
}

export async function synthesizeAiSpeech(
  text: string,
  gender: SpeakerGender,
): Promise<string> {
  const cacheKey = `${gender}:${text}`
  const hit = cache.get(cacheKey)
  if (hit) return hit

  const key = getAiTtsKey()
  if (!key) throw new Error('missing-key')

  currentAbort?.abort()
  const abort = new AbortController()
  currentAbort = abort

  const voices = await resolveVoices(abort.signal)
  const voiceId = gender === 'female' ? voices.female : voices.male

  let response = await requestSpeech(
    text,
    voiceId,
    'eleven_multilingual_v2',
    abort.signal,
  )
  if (!response.ok) {
    response = await requestSpeech(text, voiceId, 'eleven_turbo_v2_5', abort.signal)
  }
  if (!response.ok) {
    throw new Error(`elevenlabs-${response.status}`)
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  cache.set(cacheKey, url)
  if (currentAbort === abort) currentAbort = null
  return url
}
