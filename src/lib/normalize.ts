import type { CompareResult, WordMark } from '../types'

/** Remove pontuação e símbolos, preservando letras acentuadas na entrada bruta. */
const PUNCT_RE =
  /[.,!?;:…"""''«»()[\]{}<>/\\|@#$%^&*_+=~`¡¿—–‐\-]/gu

/** Formas equivalentes → canônica (mesmo sentido / fala coloquial). */
const CANON: Record<string, string> = {
  ta: 'esta',
  tá: 'esta',
  to: 'estou',
  tô: 'estou',
  tava: 'estava',
  tavam: 'estavam',
  ne: 'ne',
  né: 'ne',
  voce: 'voce',
  você: 'voce',
  ce: 'voce',
  cê: 'voce',
  pra: 'para',
  pro: 'para',
  porque: 'porque',
  porquê: 'porque',
  pq: 'porque',
  vc: 'voce',
  vcs: 'voces',
  vocês: 'voces',
  voces: 'voces',
  tb: 'tambem',
  tbm: 'tambem',
  também: 'tambem',
  tambem: 'tambem',
  q: 'que',
  quê: 'que',
  miudo: 'miudo',
  miúdo: 'miudo',
}

/** Grupos de sinônimos / paráfrases curtas. */
const SYNONYM_GROUPS: string[][] = [
  ['esta', 'estar', 'fique', 'fica', 'fico'],
  ['ir', 'vamos', 'vai', 'vou', 'indo'],
  ['falar', 'falei', 'falou', 'diz', 'disse', 'dizer', 'falando'],
  ['matar', 'mato', 'mata', 'matou'],
  [
    'pegar',
    'pego',
    'pega',
    'pegue',
    'peguei',
    'pegou',
    'apanhar',
    'apanha',
    'catar',
    'catei',
    'catou',
    'cata',
  ],
  ['deixar', 'deixa', 'deixe', 'largar', 'larga', 'largue'],
  ['olhar', 'olha', 'olhe', 'ver', 'veja', 've'],
  ['ajudar', 'ajuda', 'ajude'],
  ['obrigado', 'obrigada'],
  ['homem', 'cara', 'sujeito', 'senhor', 'seu'],
  ['mulher', 'moca'],
  ['dinheiro', 'grana', 'prata'],
  ['crianca', 'menina', 'cria', 'filha', 'filho', 'ga'],
  ['medico', 'doutor'],
  ['saco', 'sacos'],
  ['gente', 'pessoal', 'galera'],
  ['respeito', 'respeitada', 'respeitado', 'respeita'],
  ['trabalho', 'trabalha', 'trabalhar'],
  ['medo', 'apavorado', 'apavorada'],
  ['morrer', 'morreu', 'morta', 'morto'],
]

const STOP = new Set([
  'a',
  'o',
  'as',
  'os',
  'um',
  'uma',
  'uns',
  'umas',
  'de',
  'da',
  'do',
  'das',
  'dos',
  'em',
  'e',
  'ou',
  'que',
  'se',
  'com',
  'por',
  'para',
  'me',
  'te',
  'lhe',
  'nos',
  'vos',
  'eu',
  'tu',
  'ele',
  'ela',
  'eles',
  'elas',
  'meu',
  'minha',
  'seu',
  'sua',
  'ja',
  'nao',
  'so',
  'ai',
  'la',
  'ali',
  'aqui',
])

function foldAccents(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '')
}

export function normalizeText(input: string): string {
  return input
    .normalize('NFC')
    .toLowerCase()
    .replace(PUNCT_RE, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function canonicalizeToken(raw: string): string {
  const t = normalizeText(raw)
  if (!t) return ''
  const mapped = CANON[t] ?? t
  return foldAccents(mapped)
}

export function tokenize(input: string): string[] {
  const n = normalizeText(input)
  if (!n) return []
  return n.split(' ').map(canonicalizeToken).filter(Boolean)
}

function isContent(word: string): boolean {
  return !STOP.has(word) && word.length > 1
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const prev = new Array<number>(b.length + 1)
  const cur = new Array<number>(b.length + 1)
  for (let j = 0; j <= b.length; j++) prev[j] = j
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost)
    }
    for (let j = 0; j <= b.length; j++) prev[j] = cur[j]
  }
  return prev[b.length]
}

function similarity(a: string, b: string): number {
  if (!a || !b) return 0
  if (a === b) return 1
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length)
}

function sameSynonymGroup(a: string, b: string): boolean {
  for (const group of SYNONYM_GROUPS) {
    const folded = group.map(foldAccents)
    if (folded.includes(a) && folded.includes(b)) return true
  }
  return false
}

/** Duas palavras "bateram" no sentido: iguais, quase iguais ou sinônimas. */
export function wordsAlike(a: string, b: string): boolean {
  if (!a || !b) return false
  if (a === b) return true
  if (sameSynonymGroup(a, b)) return true
  const minLen = Math.min(a.length, b.length)
  const threshold = minLen <= 3 ? 0.99 : minLen <= 5 ? 0.8 : 0.72
  return similarity(a, b) >= threshold
}

function coverageNeeded(contentCount: number): number {
  if (contentCount <= 1) return 1
  if (contentCount <= 3) return 0.84
  if (contentCount <= 8) return 0.78
  return 0.72
}

/**
 * Alinha falas pelo sentido: aceita ordem flexível, sinônimos,
 * pequenas diferenças de digitação/voz e omissão de conectivos.
 */
export function compareLines(expected: string, actual: string): CompareResult {
  const expectedWords = tokenize(expected)
  const actualWords = tokenize(actual)
  const usedActual = new Set<number>()
  const matchedExpected = new Set<number>()

  for (let i = 0; i < expectedWords.length; i++) {
    const exp = expectedWords[i]
    let bestIdx = -1
    let bestScore = -1

    for (let j = 0; j < actualWords.length; j++) {
      if (usedActual.has(j)) continue
      const act = actualWords[j]
      if (!wordsAlike(exp, act)) continue
      const score =
        similarity(exp, act) +
        (sameSynonymGroup(exp, act) ? 0.05 : 0) +
        Math.max(0, 0.04 - Math.abs(i - j) * 0.005)
      if (score > bestScore) {
        bestScore = score
        bestIdx = j
      }
    }

    if (bestIdx >= 0) {
      usedActual.add(bestIdx)
      matchedExpected.add(i)
    }
  }

  const marks: WordMark[] = []

  for (let j = 0; j < actualWords.length; j++) {
    const act = actualWords[j]
    if (usedActual.has(j) || !isContent(act)) {
      marks.push({ word: act, status: 'match' })
    } else {
      marks.push({ word: act, status: 'extra' })
    }
  }

  for (let i = 0; i < expectedWords.length; i++) {
    if (matchedExpected.has(i)) continue
    const exp = expectedWords[i]
    if (!isContent(exp)) continue
    marks.push({ word: exp, status: 'missing' })
  }

  let matchedContent = 0
  let totalContent = 0
  for (let i = 0; i < expectedWords.length; i++) {
    if (!isContent(expectedWords[i])) continue
    totalContent += 1
    if (matchedExpected.has(i)) matchedContent += 1
  }

  const extraContent = marks.filter((m) => m.status === 'extra').length
  const ratio =
    totalContent === 0
      ? actualWords.length > 0
        ? 1
        : 0
      : matchedContent / totalContent
  const needed = coverageNeeded(totalContent)
  const extraPenalty =
    totalContent === 0 ? 0 : extraContent / Math.max(totalContent, 1)

  const ok =
    actualWords.length > 0 && ratio >= needed && extraPenalty <= 0.45

  return { ok, expectedWords, actualWords, marks }
}

export function textsMatch(expected: string, actual: string): boolean {
  return compareLines(expected, actual).ok
}

export function attemptKey(scene: string, turnIndex: number): string {
  return `${scene}:${turnIndex}`
}

export function romanToLabel(scene: string): string {
  return `Cena ${scene}`
}
