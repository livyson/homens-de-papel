import type { ProgressState } from '../types'
import { attemptKey } from './normalize'

const STORAGE_KEY = 'homens-de-papel:progress:v1'

const empty = (): ProgressState => ({
  completedScenes: [],
  attempts: {},
  updatedAt: new Date().toISOString(),
})

export function loadProgress(): ProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return empty()
    const parsed = JSON.parse(raw) as ProgressState
    return {
      completedScenes: Array.isArray(parsed.completedScenes)
        ? parsed.completedScenes
        : [],
      attempts:
        parsed.attempts && typeof parsed.attempts === 'object'
          ? parsed.attempts
          : {},
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    }
  } catch {
    return empty()
  }
}

export function saveProgress(state: ProgressState): void {
  const next = { ...state, updatedAt: new Date().toISOString() }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}

export function recordAttempt(
  state: ProgressState,
  scene: string,
  turnIndex: number,
): ProgressState {
  const key = attemptKey(scene, turnIndex)
  const next: ProgressState = {
    ...state,
    attempts: {
      ...state.attempts,
      [key]: (state.attempts[key] ?? 0) + 1,
    },
  }
  saveProgress(next)
  return next
}

export function markSceneComplete(
  state: ProgressState,
  scene: string,
): ProgressState {
  if (state.completedScenes.includes(scene)) {
    saveProgress(state)
    return state
  }
  const next: ProgressState = {
    ...state,
    completedScenes: [...state.completedScenes, scene],
  }
  saveProgress(next)
  return next
}

export function getSceneAttempts(
  state: ProgressState,
  scene: string,
  turnIndexes: number[],
): number {
  return turnIndexes.reduce(
    (sum, idx) => sum + (state.attempts[attemptKey(scene, idx)] ?? 0),
    0,
  )
}

export function clearProgress(): ProgressState {
  const next = empty()
  saveProgress(next)
  return next
}
