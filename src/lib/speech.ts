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
