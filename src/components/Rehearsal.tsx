import { useEffect, useMemo, useRef, useState } from 'react'
import { FridoPrompt } from './FridoPrompt'
import { TurnCard } from './TurnCard'
import { attemptKey } from '../lib/normalize'
import { markSceneComplete, recordAttempt } from '../lib/progress'
import { getScene, isFridoTurn } from '../lib/scenes'
import type { InputMode, ProgressState } from '../types'

type Props = {
  sceneIds: string[]
  mode: InputMode
  progress: ProgressState
  onProgressChange: (next: ProgressState | ((prev: ProgressState) => ProgressState)) => void
  onExit: () => void
  onFinished: () => void
}

const AUTO_MS = 2200

export function Rehearsal({
  sceneIds,
  mode,
  progress,
  onProgressChange,
  onExit,
  onFinished,
}: Props) {
  const [scenePos, setScenePos] = useState(0)
  const [turnIndex, setTurnIndex] = useState(0)
  const [autoPlay, setAutoPlay] = useState(true)
  const [history, setHistory] = useState<number[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  const sceneId = sceneIds[scenePos]
  const scene = getScene(sceneId)
  const turn = scene?.turns[turnIndex]
  const waitingForFrido = Boolean(turn && isFridoTurn(turn))

  const fridoTotalInScene = useMemo(
    () => scene?.turns.filter(isFridoTurn).length ?? 0,
    [scene],
  )

  const fridoDoneInScene = useMemo(() => {
    if (!scene) return 0
    return scene.turns.slice(0, turnIndex).filter(isFridoTurn).length
  }, [scene, turnIndex])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [turnIndex, scenePos, waitingForFrido])

  useEffect(() => {
    if (!scene || !turn || waitingForFrido || !autoPlay) return undefined

    const timer = window.setTimeout(() => {
      if (turnIndex + 1 >= scene.turns.length) {
        onProgressChange((prev) => markSceneComplete(prev, sceneId))
        if (scenePos + 1 < sceneIds.length) {
          setScenePos((p) => p + 1)
          setTurnIndex(0)
          setHistory([])
        } else {
          onFinished()
        }
        return
      }
      setHistory((h) => [...h, turnIndex])
      setTurnIndex((i) => i + 1)
    }, AUTO_MS)

    return () => window.clearTimeout(timer)
  }, [
    autoPlay,
    onFinished,
    onProgressChange,
    scene,
    sceneId,
    sceneIds.length,
    scenePos,
    turn,
    turnIndex,
    waitingForFrido,
  ])

  if (!scene || !turn) {
    return (
      <div className="rehearsal">
        <p>Cena não encontrada.</p>
        <button type="button" className="btn btn--primary" onClick={onExit}>
          Voltar
        </button>
      </div>
    )
  }

  function finishScene() {
    onProgressChange((prev) => markSceneComplete(prev, sceneId))
    if (scenePos + 1 < sceneIds.length) {
      setScenePos((p) => p + 1)
      setTurnIndex(0)
      setHistory([])
    } else {
      onFinished()
    }
  }

  function advance() {
    const current = getScene(sceneId)
    if (!current) return
    if (turnIndex + 1 >= current.turns.length) {
      finishScene()
      return
    }
    setHistory((h) => [...h, turnIndex])
    setTurnIndex((i) => i + 1)
  }

  function handleAttempt() {
    onProgressChange((prev) => recordAttempt(prev, sceneId, turnIndex))
  }

  const attemptCount = progress.attempts[attemptKey(sceneId, turnIndex)] ?? 0

  return (
    <div className="rehearsal">
      <header className="rehearsal__bar">
        <button type="button" className="btn btn--ghost" onClick={onExit}>
          Sair
        </button>
        <div className="rehearsal__status">
          <strong>Cena {sceneId}</strong>
          <span>
            {scenePos + 1}/{sceneIds.length} · Frido {fridoDoneInScene}/
            {fridoTotalInScene}
          </span>
        </div>
        <label className="rehearsal__auto">
          <input
            type="checkbox"
            checked={autoPlay}
            onChange={(e) => setAutoPlay(e.target.checked)}
          />
          Auto
        </label>
      </header>

      <div className="rehearsal__feed" aria-live="polite">
        {history.map((idx) => (
          <TurnCard key={`${sceneId}-${idx}`} turn={scene.turns[idx]} />
        ))}

        {!waitingForFrido && <TurnCard turn={turn} highlight />}

        {waitingForFrido && (
          <FridoPrompt
            key={`${sceneId}-${turnIndex}`}
            turn={turn}
            mode={mode}
            attemptCount={attemptCount}
            onAttempt={handleAttempt}
            onCorrect={advance}
            onSkip={advance}
          />
        )}
        <div ref={bottomRef} />
      </div>

      {!waitingForFrido && (
        <div className="rehearsal__controls">
          <button
            type="button"
            className="btn btn--primary btn--block"
            onClick={advance}
          >
            Próxima fala
          </button>
        </div>
      )}
    </div>
  )
}
