import { cancelAiTts, hasAiTtsKey, synthesizeAiSpeech } from './aiTts'
import { prepareSpeech, type SpeechDelivery } from './intonation'
import { speakerGender, type SpeakerGender } from './script'

type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type SpeechRecognitionEventLike = {
  results: {
    length: number
    [index: number]: {
      isFinal: boolean
      [index: number]: { transcript: string }
    }
  }
}

type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike
  webkitSpeechRecognition?: new () => SpeechRecognitionLike
}

export function isSpeechSupported(): boolean {
  if (typeof window === 'undefined') return false
  const w = window as SpeechWindow
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition)
}

export function createRecognizer(): SpeechRecognitionLike | null {
  if (typeof window === 'undefined') return null
  const w = window as SpeechWindow
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition
  if (!Ctor) return null
  const rec = new Ctor()
  rec.lang = 'pt-BR'
  rec.continuous = false
  rec.interimResults = true
  rec.maxAlternatives = 1
  return rec
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined'
}

function isBrowserTtsAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

/** Remove rubricas entre parênteses para a leitura soar como fala de palco. */
export function spokenDialogue(text: string): string {
  return prepareSpeech(text).spoken
}

export type SpeakOutcome = 'spoke' | 'skipped' | 'failed'

export type TtsProgress = {
  status: string
  progresso: number
  arquivo?: string
}

type NeuralAudio = {
  duracao: number
  tocar: () => Promise<void>
  parar: () => void
}

type NeuralEngine = {
  falar: (
    texto: string,
    opcoes?: {
      velocidade?: number
      ruido?: number
      ruidoW?: number
      voz?: string
    },
  ) => Promise<NeuralAudio>
}

let kokoro: NeuralEngine | null = null
let kokoroPromise: Promise<NeuralEngine | null> | null = null
let piper: NeuralEngine | null = null
let piperPromise: Promise<NeuralEngine | null> | null = null
let lastProgress: TtsProgress = { status: 'idle', progresso: 0 }
const progressListeners = new Set<(p: TtsProgress) => void>()

let currentPlayback: { parar: () => void } | null = null
let currentUtterance: SpeechSynthesisUtterance | null = null
let keepAliveTimer: number | null = null

function emitProgress(p: TtsProgress) {
  lastProgress = p
  for (const cb of progressListeners) cb(p)
}

export function isNeuralTtsReady(): boolean {
  return hasAiTtsKey() || kokoro !== null || piper !== null
}

export function getTtsProgress(): TtsProgress {
  return lastProgress
}

export function onTtsProgress(cb: (p: TtsProgress) => void): () => void {
  progressListeners.add(cb)
  cb(lastProgress)
  return () => {
    progressListeners.delete(cb)
  }
}

function clearKeepAlive() {
  if (keepAliveTimer !== null) {
    window.clearInterval(keepAliveTimer)
    keepAliveTimer = null
  }
}

function hashSpeaker(speaker: string): number {
  let hash = 0
  for (let i = 0; i < speaker.length; i++) {
    hash = (hash * 31 + speaker.charCodeAt(i)) >>> 0
  }
  return hash
}

function rateForSpeaker(speaker?: string | null, scale = 1): number {
  const base = speaker ? 0.88 + (hashSpeaker(speaker) % 13) / 100 : 0.94
  return Math.min(1.25, Math.max(0.7, base * scale))
}

function unlockAudio() {
  if (typeof window === 'undefined') return
  try {
    const AC =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (AC) {
      const ctx = new AC()
      const buffer = ctx.createBuffer(1, 1, 22050)
      const src = ctx.createBufferSource()
      src.buffer = buffer
      src.connect(ctx.destination)
      src.start(0)
      void ctx.resume()
    }
  } catch {
    /* ignore */
  }
  if (!isBrowserTtsAvailable()) return
  try {
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(' ')
    u.volume = 0
    u.lang = 'pt-BR'
    window.speechSynthesis.speak(u)
    window.speechSynthesis.cancel()
  } catch {
    /* ignore */
  }
}

async function ensureKokoro(): Promise<NeuralEngine | null> {
  if (typeof window === 'undefined') return null
  if (kokoro) return kokoro
  if (kokoroPromise) return kokoroPromise

  kokoroPromise = (async () => {
    emitProgress({ status: 'iniciando', progresso: 0 })
    try {
      const { Vozz } = await import('@pedrobef/vozz')
      const engine = await Vozz.carregar({
        dispositivo: 'auto',
        aoProgredir: (p) => {
          emitProgress({
            status: p.status,
            progresso: p.progresso ?? lastProgress.progresso,
            arquivo: p.arquivo,
          })
        },
      })
      kokoro = engine
      emitProgress({ status: 'pronto', progresso: 1 })
      return engine
    } catch {
      kokoroPromise = null
      emitProgress({ status: 'erro', progresso: 0 })
      return null
    }
  })()

  return kokoroPromise
}

async function ensurePiper(): Promise<NeuralEngine | null> {
  if (typeof window === 'undefined') return null
  if (piper) return piper
  if (piperPromise) return piperPromise

  piperPromise = (async () => {
    try {
      const { Piper } = await import('@pedrobef/vozz/piper')
      const engine = await Piper.carregar({
        dispositivo: 'auto',
        aoProgredir: (p) => {
          emitProgress({
            status: p.status,
            progresso: p.progresso,
            arquivo: p.arquivo,
          })
        },
      })
      piper = engine
      emitProgress({ status: 'pronto', progresso: 1 })
      return engine
    } catch {
      piperPromise = null
      return null
    }
  })()

  return piperPromise
}

export async function ensureNeuralTts(): Promise<NeuralEngine | null> {
  if (hasAiTtsKey()) {
    emitProgress({ status: 'pronto', progresso: 1 })
    return { falar: async () => ({ duracao: 0, tocar: async () => {}, parar: () => {} }) }
  }
  const gendered = await ensureKokoro()
  if (gendered) return gendered
  return ensurePiper()
}

/** Desbloqueia áudio no gesto do usuário e começa a baixar a voz neural. */
export function warmupSpeech() {
  unlockAudio()
  if (!hasAiTtsKey()) void ensureNeuralTts()
}

export function cancelSpeech() {
  cancelAiTts()
  currentPlayback?.parar()
  currentPlayback = null
  if (!isBrowserTtsAvailable()) return
  clearKeepAlive()
  currentUtterance = null
  window.speechSynthesis.cancel()
}

function playUrl(url: string): Promise<SpeakOutcome> {
  return new Promise((resolve) => {
    const el = new Audio(url)
    let settled = false
    const finish = (outcome: SpeakOutcome) => {
      if (settled) return
      settled = true
      try {
        el.pause()
      } catch {
        /* ignore */
      }
      if (currentPlayback?.parar === stop) currentPlayback = null
      resolve(outcome)
    }
    const stop = () => finish('skipped')
    currentPlayback = { parar: stop }
    el.onended = () => finish('spoke')
    el.onerror = () => finish('failed')
    el.play().catch(() => finish('failed'))
  })
}

function playNeural(audio: NeuralAudio): Promise<SpeakOutcome> {
  if (!audio.duracao) return Promise.resolve('skipped')
  return new Promise((resolve) => {
    let settled = false
    const finish = (outcome: SpeakOutcome) => {
      if (settled) return
      settled = true
      if (currentPlayback?.parar === stop) currentPlayback = null
      resolve(outcome)
    }
    const stop = () => {
      try {
        audio.parar()
      } catch {
        /* ignore */
      }
      finish('skipped')
    }
    currentPlayback = { parar: stop }
    audio.tocar().then(() => finish('spoke')).catch(() => finish('failed'))
  })
}

function isBrazilianVoice(voice: SpeechSynthesisVoice): boolean {
  const lang = voice.lang.replace('_', '-').toLowerCase()
  const name = voice.name.toLowerCase()
  if (
    lang === 'pt-pt' ||
    /portugal|lisboa|joana|catarina|duarte|in[eê]s|cristiano/.test(name)
  ) {
    return false
  }
  if (lang === 'pt-br') return true
  return /brasil|brazil|luciana|fernanda|francisca|ant[oô]nio/.test(name)
}

function pickVoice(gender: SpeakerGender): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices().filter(isBrazilianVoice)
  const byName =
    gender === 'female'
      ? /luciana|fernanda|francisca|maria|dora|feminina|female/
      : /ant[oô]nio|felipe|ricardo|daniel|alex|santa|masculin|male/
  const matched = voices.filter((v) => byName.test(v.name.toLowerCase()))
  const ranked = matched.length ? matched : voices
  return (
    ranked.find((v) =>
      /neural|enhanced|premium|natural|google/i.test(v.name),
    ) ||
    ranked[0] ||
    null
  )
}

function waitForVoices(): Promise<void> {
  if (!isBrowserTtsAvailable()) return Promise.resolve()
  if (window.speechSynthesis.getVoices().length) return Promise.resolve()
  return new Promise((resolve) => {
    const done = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', done)
      resolve()
    }
    window.speechSynthesis.addEventListener('voiceschanged', done)
    window.setTimeout(done, 400)
  })
}

function speakWithBrowser(
  delivery: SpeechDelivery,
  speaker?: string | null,
  gender: SpeakerGender = 'male',
): Promise<SpeakOutcome> {
  if (!isBrowserTtsAvailable()) return Promise.resolve('failed')
  const voice = pickVoice(gender)
  if (!voice) return Promise.resolve('failed')
  return new Promise((resolve) => {
    let started = false
    let settled = false

    const utterance = new SpeechSynthesisUtterance(delivery.spoken)
    currentUtterance = utterance
    utterance.lang = 'pt-BR'
    utterance.voice = voice
    utterance.rate = rateForSpeaker(speaker, delivery.rateScale)
    const basePitch = gender === 'female' ? 1.08 : 0.92
    utterance.pitch = Math.min(2, Math.max(0.5, basePitch + delivery.pitchShift))

    const finish = (outcome: SpeakOutcome) => {
      if (settled) return
      settled = true
      clearKeepAlive()
      if (currentUtterance === utterance) currentUtterance = null
      resolve(outcome)
    }

    utterance.onstart = () => {
      started = true
    }
    utterance.onend = () => finish(started ? 'spoke' : 'failed')
    utterance.onerror = () => finish(started ? 'spoke' : 'failed')

    keepAliveTimer = window.setInterval(() => {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.pause()
        window.speechSynthesis.resume()
      }
    }, 12000)

    try {
      window.speechSynthesis.speak(utterance)
    } catch {
      finish('failed')
    }
  })
}

export async function speakLine(opts: {
  text: string
  speaker?: string | null
}): Promise<SpeakOutcome> {
  if (typeof window === 'undefined') return 'failed'
  const delivery = prepareSpeech(opts.text)
  if (!delivery.spoken) return 'skipped'

  cancelSpeech()

  const gender = speakerGender(opts.speaker)
  const rate = rateForSpeaker(opts.speaker, delivery.rateScale)

  if (hasAiTtsKey()) {
    try {
      const url = await synthesizeAiSpeech(delivery, gender)
      return await playUrl(url)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return 'skipped'
      }
      /* cai no motor local */
    }
  }

  const voiceName = gender === 'female' ? 'dora' : 'alex'

  try {
    const gendered = await ensureKokoro()
    if (gendered) {
      const audio = await gendered.falar(delivery.spoken, {
        velocidade: rate,
        voz: voiceName,
      })
      return await playNeural(audio)
    }
  } catch {
    /* tenta Piper / navegador */
  }

  if (gender === 'male') {
    try {
      const maleEngine = await ensurePiper()
      if (maleEngine) {
        const audio = await maleEngine.falar(delivery.spoken, {
          velocidade: rate,
          ruido: 0.78,
          ruidoW: 0.9,
        })
        return await playNeural(audio)
      }
    } catch {
      /* cai no fallback do navegador */
    }
  }

  await waitForVoices()
  return speakWithBrowser(delivery, opts.speaker, gender)
}
