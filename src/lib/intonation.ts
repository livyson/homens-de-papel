/** Entende a fala (rubricas + texto) e define como ela deve ser dita. */

export type DeliveryTone =
  | 'neutral'
  | 'questioning'
  | 'angry'
  | 'shouting'
  | 'whisper'
  | 'sad'
  | 'crying'
  | 'happy'
  | 'laughing'
  | 'sarcastic'
  | 'scared'
  | 'pained'
  | 'embarrassed'
  | 'thoughtful'
  | 'gentle'
  | 'excited'

export type SpeechDelivery = {
  /** Texto limpo, sem rubricas — o que de fato se fala. */
  spoken: string
  /** Texto com tags de áudio da ElevenLabs v3. */
  tagged: string
  tone: DeliveryTone
  stability: number
  style: number
  speed: number
  rateScale: number
  pitchShift: number
}

type Cue = {
  tone: DeliveryTone
  tag: string
  event?: boolean
}

type Piece = { kind: 'speech' | 'dir'; text: string }

const TONE_RANK: Record<DeliveryTone, number> = {
  shouting: 8,
  angry: 7,
  crying: 7,
  scared: 6,
  pained: 6,
  excited: 5,
  laughing: 5,
  sarcastic: 5,
  whisper: 5,
  sad: 4,
  embarrassed: 4,
  happy: 3,
  questioning: 3,
  thoughtful: 3,
  gentle: 3,
  neutral: 0,
}

const SETTINGS: Record<
  DeliveryTone,
  { stability: number; style: number; speed: number; rateScale: number; pitchShift: number }
> = {
  neutral: { stability: 0.42, style: 0.32, speed: 1, rateScale: 1, pitchShift: 0 },
  questioning: { stability: 0.36, style: 0.42, speed: 0.98, rateScale: 0.98, pitchShift: 0.06 },
  angry: { stability: 0.22, style: 0.68, speed: 1.08, rateScale: 1.08, pitchShift: -0.04 },
  shouting: { stability: 0.2, style: 0.72, speed: 1.12, rateScale: 1.12, pitchShift: 0.08 },
  whisper: { stability: 0.4, style: 0.48, speed: 0.86, rateScale: 0.82, pitchShift: -0.08 },
  sad: { stability: 0.32, style: 0.5, speed: 0.88, rateScale: 0.86, pitchShift: -0.1 },
  crying: { stability: 0.24, style: 0.66, speed: 0.84, rateScale: 0.8, pitchShift: 0.04 },
  happy: { stability: 0.3, style: 0.55, speed: 1.04, rateScale: 1.04, pitchShift: 0.08 },
  laughing: { stability: 0.26, style: 0.6, speed: 1.05, rateScale: 1.05, pitchShift: 0.1 },
  sarcastic: { stability: 0.28, style: 0.58, speed: 0.96, rateScale: 0.96, pitchShift: 0.04 },
  scared: { stability: 0.26, style: 0.62, speed: 1.06, rateScale: 1.06, pitchShift: 0.1 },
  pained: { stability: 0.3, style: 0.55, speed: 0.86, rateScale: 0.84, pitchShift: -0.06 },
  embarrassed: { stability: 0.38, style: 0.45, speed: 0.9, rateScale: 0.9, pitchShift: -0.04 },
  thoughtful: { stability: 0.4, style: 0.38, speed: 0.9, rateScale: 0.9, pitchShift: -0.02 },
  gentle: { stability: 0.4, style: 0.4, speed: 0.88, rateScale: 0.86, pitchShift: 0.02 },
  excited: { stability: 0.24, style: 0.64, speed: 1.1, rateScale: 1.1, pitchShift: 0.1 },
}

function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
}

function spokenDialogue(text: string): string {
  return text
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function splitLine(text: string): Piece[] {
  const parts: Piece[] = []
  const re = /\(([^)]*)\)/g
  let last = 0
  let match: RegExpExecArray | null
  while ((match = re.exec(text))) {
    const before = text.slice(last, match.index).replace(/\s+/g, ' ').trim()
    if (before) parts.push({ kind: 'speech', text: before })
    const dir = match[1].replace(/\s+/g, ' ').trim()
    if (dir) parts.push({ kind: 'dir', text: dir })
    last = match.index + match[0].length
  }
  const after = text.slice(last).replace(/\s+/g, ' ').trim()
  if (after) parts.push({ kind: 'speech', text: after })
  return parts
}

function cueFromDirection(dir: string): Cue | null {
  const f = fold(dir)
  if (/^(todos|todas)\b/.test(f)) return null

  const short = f.split(/\s+/).filter(Boolean).length <= 6
  const hit = (re: RegExp) => re.test(f) && (short || re.test(f.slice(0, 28)))

  if (/^(pausa longa|silencio (pesado|longo))\b/.test(f)) {
    return { tone: 'thoughtful', tag: '[long pause]', event: true }
  }
  if (/^(pausa|silencio)\b/.test(f)) {
    return { tone: 'thoughtful', tag: '[short pause]', event: true }
  }
  if (hit(/\b(baixinho|sussurr|a parte|entre dentes|murmur)\b/)) {
    return { tone: 'whisper', tag: '[whispers]' }
  }
  if (hit(/\b(gritando|berrando|grita|berro|histeri)\b/)) {
    if (/\b(feliz|alegre|viva|festa)\b/.test(f)) {
      return { tone: 'excited', tag: '[excited]' }
    }
    return { tone: 'shouting', tag: '[shouting]' }
  }
  if (hit(/\b(bravo|raiva|furios[oa]|explosiv[oa])\b/)) {
    return { tone: 'angry', tag: '[angry]' }
  }
  if (hit(/\b(ironic|sarcas)\b/)) return { tone: 'sarcastic', tag: '[sarcastic]' }
  if (hit(/\b(chorando|chora nervosa|chora\b|soluc)\b/)) {
    return { tone: 'crying', tag: '[crying]' }
  }
  if (hit(/\b(rindo|ri\b)/) || /^ri\b/.test(f)) {
    return { tone: 'laughing', tag: '[laughs]' }
  }
  if (hit(/\b(alegre|feliz|contente)\b/)) return { tone: 'happy', tag: '[happy]' }
  if (hit(/\b(bem triste|triste|abatid)\b/)) return { tone: 'sad', tag: '[sad]' }
  if (hit(/\b(com medo|assustad|apavorad|desesper)\b/)) {
    return { tone: 'scared', tag: '[scared]' }
  }
  if (hit(/\b(sufocando|gemendo|geme|ofegant)\b/)) {
    return { tone: 'pained', tag: '[pained]' }
  }
  if (hit(/\b(sem jeito|encabulad|envergonhad)\b/)) {
    return { tone: 'embarrassed', tag: '[sheepishly]' }
  }
  if (hit(/\b(suspirando|suspiro)\b/)) {
    return { tone: 'thoughtful', tag: '[sighs]' }
  }
  if (hit(/\b(ninando|nana|aconselhando|doce|terno)\b/)) {
    return { tone: 'gentle', tag: '[gently]' }
  }
  if (hit(/\b(acordando|ressaca|sonolent)\b/)) {
    return { tone: 'pained', tag: '[groggy]' }
  }
  return null
}

function cueFromSpeech(speech: string): Cue | null {
  const f = fold(speech)
  const bangs = (speech.match(/!/g) ?? []).length
  const questions = (speech.match(/\?/g) ?? []).length
  const dots = /\.\.\.|…/.test(speech)
  const words = f.split(/[^a-z0-9]+/).filter(Boolean)

  if (/^(psiu|pss+|xiu)\b/.test(f)) {
    return { tone: 'whisper', tag: '[whispers]' }
  }
  if (/\b(pai nosso|ave maria)\b/.test(f)) {
    return { tone: 'sad', tag: '[sad]' }
  }

  const angryHit = words.some((w) =>
    /^(arrebento|arrebentar|mata|mato|matar|bala|merda|porra|porco|vaca|sacana|vagabundo|vagabunda|filhadaputa|otario|dane|cala|berreiro|quieta|peste)$/.test(
      w,
    ),
  )
  const threat = /\b(te meto|te arrebento|te acabar|te mata|te paga|filha.?da.?puta)\b/.test(f)
  const scaredHit = /\b(socorro|me acuda|vai morrer|com medo|nao! nao)\b/.test(f)
  const sadHit = /\b(morreu|minha filha|ai,? meu deus|bem triste)\b/.test(f)
  const happyHit = /\b(boa!?|viva|eita|festa|molhar a goela)\b/.test(f)
  const painHit = /^(ai+|hein)([.?!…]*|$)/.test(f) || /\bai\.\.\.?\s*ai\b/.test(f)

  if (threat || (angryHit && bangs > 0)) {
    return bangs >= 2 ? { tone: 'shouting', tag: '[shouting]' } : { tone: 'angry', tag: '[angry]' }
  }
  if (scaredHit) return { tone: 'scared', tag: '[scared]' }
  if (painHit) return { tone: 'pained', tag: '[pained]' }
  if (sadHit) return { tone: 'sad', tag: '[sad]' }
  if (happyHit && bangs > 0) return { tone: 'excited', tag: '[excited]' }
  if (angryHit) return { tone: 'angry', tag: '[angry]' }

  if (questions > 0 && bangs > 0) return { tone: 'angry', tag: '[angry]' }
  if (questions > 0) return { tone: 'questioning', tag: '[curious]' }
  if (bangs >= 2) return { tone: 'excited', tag: '[excited]' }
  if (bangs === 1 && speech.length < 28) return { tone: 'excited', tag: '[excited]' }
  if (dots && speech.length < 40) return { tone: 'thoughtful', tag: '[thoughtful]' }
  return null
}

function stronger(a: DeliveryTone, b: DeliveryTone): DeliveryTone {
  return TONE_RANK[a] >= TONE_RANK[b] ? a : b
}

function joinTagged(chunks: string[]): string {
  return chunks
    .join(' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?…])/g, '$1')
    .trim()
}

/**
 * Lê rubricas e o sentido da fala para montar a entrega vocal.
 * Não altera as palavras ditas — só acrescenta direção de cena.
 */
export function prepareSpeech(rawText: string): SpeechDelivery {
  const spoken = spokenDialogue(rawText)
  const empty: SpeechDelivery = {
    spoken,
    tagged: spoken,
    tone: 'neutral',
    ...SETTINGS.neutral,
  }
  if (!spoken) return empty

  const pieces = splitLine(rawText)
  const chunks: string[] = []
  let tone: DeliveryTone = 'neutral'
  let pending: Cue | null = null

  const flushEvent = (cue: Cue) => {
    chunks.push(cue.tag)
    tone = stronger(tone, cue.tone)
  }

  for (const piece of pieces) {
    if (piece.kind === 'dir') {
      const cue = cueFromDirection(piece.text)
      if (!cue) continue
      if (cue.event) {
        flushEvent(cue)
        pending = null
      } else {
        pending = cue
      }
      continue
    }

    const speechCue = cueFromSpeech(piece.text)
    const used = pending ?? speechCue
    pending = null
    if (used) {
      chunks.push(`${used.tag} ${piece.text}`)
      tone = stronger(tone, used.tone)
    } else {
      chunks.push(piece.text)
    }
  }

  if (pending) flushEvent(pending)

  const tagged = joinTagged(chunks) || spoken
  return { spoken, tagged, tone, ...SETTINGS[tone] }
}
