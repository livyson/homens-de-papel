import { useEffect, useMemo, useState } from 'react'
import { LinePrompt } from './LinePrompt'
import {
  getCharacterProgress,
  markMemorized,
  markSceneComplete,
  recordAttempt,
} from '../lib/progress'
import { getLinesForScenes, parseSceneKey, sceneKey } from '../lib/script'
import type { InputMode, ProgressState } from '../types'

type Props = {
  character: string
  sceneKeys: string[]
  mode: InputMode
  progress: ProgressState
  onProgressChange: (
    next: ProgressState | ((prev: ProgressState) => ProgressState),
  ) => void
  onExit: () => void
  onFinished: () => void
}

export function Rehearsal({
  character,
  sceneKeys,
  mode,
  progress,
  onProgressChange,
  onExit,
  onFinished,
}: Props) {
  const lines = useMemo(
    () => getLinesForScenes(character, sceneKeys),
    [character, sceneKeys],
  )
  const [index, setIndex] = useState(0)
  const line = lines[index]
  const charProg = getCharacterProgress(progress, character)

  const sceneProgress = useMemo(() => {
    if (!line) return { memorized: 0, total: 0 }
    const inScene = lines.filter(
      (l) => l.actId === line.actId && l.scene === line.scene,
    )
    const mem = new Set(charProg.memorized)
    return {
      memorized: inScene.filter((l) => mem.has(l.id)).length,
      total: inScene.length,
    }
  }, [line, lines, charProg.memorized])

  useEffect(() => {
    if (lines.length > 0 && index >= lines.length) onFinished()
  }, [index, lines.length, onFinished])

  if (!lines.length) {
    return (
      <div className="rehearsal">
        <p>Nenhuma fala deste personagem nas cenas escolhidas.</p>
        <button type="button" className="btn btn--primary" onClick={onExit}>
          Voltar
        </button>
      </div>
    )
  }

  if (!line) {
    return null
  }

  function completeIfSceneDone(fromIndex: number) {
    const current = lines[fromIndex]
    if (!current) return
    const key = sceneKey(current.actId, current.scene)
    const next = lines[fromIndex + 1]
    const leavingScene = !next || next.actId !== current.actId || next.scene !== current.scene
    if (leavingScene) {
      onProgressChange((prev) => markSceneComplete(prev, character, key))
    }
  }

  function advance(markDone: boolean) {
    if (markDone) {
      onProgressChange((prev) => markMemorized(prev, character, line.id))
    }
    completeIfSceneDone(index)
    if (index + 1 >= lines.length) {
      onFinished()
      return
    }
    setIndex((i) => i + 1)
  }

  const attemptCount = charProg.attempts[line.id] ?? 0
  const sceneLabel = `${line.actLabel} · Cena ${line.scene}`
  const scenePos =
    sceneKeys.findIndex(
      (k) => k === sceneKey(line.actId, line.scene),
    ) + 1

  return (
    <div className="rehearsal">
      <header className="rehearsal__bar">
        <button type="button" className="btn btn--ghost" onClick={onExit}>
          Sair
        </button>
        <div className="rehearsal__status">
          <strong>{character}</strong>
          <span>
            {sceneLabel} · cena {scenePos}/{sceneKeys.length}
          </span>
          <span>
            Fala {index + 1}/{lines.length} · decoradas na cena{' '}
            {sceneProgress.memorized}/{sceneProgress.total}
          </span>
        </div>
        <span className="rehearsal__tag">Cego</span>
      </header>

      <div className="rehearsal__feed">
        <LinePrompt
          key={line.id}
          line={line}
          character={character}
          mode={mode}
          attemptCount={attemptCount}
          alreadyMemorized={charProg.memorized.includes(line.id)}
          onAttempt={() =>
            onProgressChange((prev) => recordAttempt(prev, character, line.id))
          }
          onCorrect={() => advance(true)}
          onSkip={() => advance(false)}
        />
      </div>

      <p className="rehearsal__nav-hint">
        Próximas cenas na fila:{' '}
        {sceneKeys
          .slice(scenePos)
          .map((k) => {
            const { scene } = parseSceneKey(k)
            return scene
          })
          .join(', ') || '—'}
      </p>
    </div>
  )
}
