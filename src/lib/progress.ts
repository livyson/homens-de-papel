import type { CharacterProgress, ProgressState } from '../types'

const STORAGE_KEY = 'homens-de-papel:progress:v2'
const LEGACY_KEY = 'homens-de-papel:progress:v1'

function emptyCharacter(): CharacterProgress {
  return { memorized: [], attempts: {}, completedScenes: [] }
}

const empty = (): ProgressState => ({
  version: 2,
  byCharacter: {},
  updatedAt: new Date().toISOString(),
})

export function loadProgress(): ProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as ProgressState
      if (parsed.version === 2 && parsed.byCharacter) {
        return {
          version: 2,
          byCharacter: parsed.byCharacter,
          lastCharacter: parsed.lastCharacter,
          updatedAt: parsed.updatedAt || new Date().toISOString(),
        }
      }
    }
    // limpa legado Frido-only sem migrar (schema diferente)
    localStorage.removeItem(LEGACY_KEY)
  } catch {
    /* ignore */
  }
  return empty()
}

export function saveProgress(state: ProgressState): void {
  const next = { ...state, version: 2 as const, updatedAt: new Date().toISOString() }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}

function withCharacter(
  state: ProgressState,
  character: string,
  updater: (current: CharacterProgress) => CharacterProgress,
): ProgressState {
  const current = state.byCharacter[character] ?? emptyCharacter()
  const nextChar = updater(current)
  const next: ProgressState = {
    ...state,
    lastCharacter: character,
    byCharacter: {
      ...state.byCharacter,
      [character]: nextChar,
    },
  }
  saveProgress(next)
  return next
}

export function getCharacterProgress(
  state: ProgressState,
  character: string,
): CharacterProgress {
  return state.byCharacter[character] ?? emptyCharacter()
}

export function recordAttempt(
  state: ProgressState,
  character: string,
  lineId: string,
): ProgressState {
  return withCharacter(state, character, (current) => ({
    ...current,
    attempts: {
      ...current.attempts,
      [lineId]: (current.attempts[lineId] ?? 0) + 1,
    },
  }))
}

export function markMemorized(
  state: ProgressState,
  character: string,
  lineId: string,
): ProgressState {
  return withCharacter(state, character, (current) => {
    if (current.memorized.includes(lineId)) return current
    return {
      ...current,
      memorized: [...current.memorized, lineId],
    }
  })
}

export function unmarkMemorized(
  state: ProgressState,
  character: string,
  lineId: string,
): ProgressState {
  return withCharacter(state, character, (current) => ({
    ...current,
    memorized: current.memorized.filter((id) => id !== lineId),
  }))
}

export function markSceneComplete(
  state: ProgressState,
  character: string,
  sceneKeyValue: string,
): ProgressState {
  return withCharacter(state, character, (current) => {
    if (current.completedScenes.includes(sceneKeyValue)) return current
    return {
      ...current,
      completedScenes: [...current.completedScenes, sceneKeyValue],
    }
  })
}

export function countMemorizedIn(
  state: ProgressState,
  character: string,
  lineIds: string[],
): number {
  const set = new Set(getCharacterProgress(state, character).memorized)
  return lineIds.reduce((n, id) => n + (set.has(id) ? 1 : 0), 0)
}

export function setLastCharacter(
  state: ProgressState,
  character: string,
): ProgressState {
  const next = { ...state, lastCharacter: character }
  saveProgress(next)
  return next
}

export function clearCharacterProgress(
  state: ProgressState,
  character: string,
): ProgressState {
  const byCharacter = { ...state.byCharacter }
  delete byCharacter[character]
  const next = { ...state, byCharacter }
  saveProgress(next)
  return next
}

export function clearProgress(): ProgressState {
  const next = empty()
  saveProgress(next)
  return next
}
