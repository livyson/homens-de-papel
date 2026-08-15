import { useEffect, useMemo, useRef, useState } from 'react'
import { LinePrompt } from './LinePrompt'
import { SpeechBubble } from './SpeechBubble'
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis'
import {
  getCharacterProgress,
  markMemorized,
  markSceneComplete,
  recordAttempt,
} from '../lib/progress'
import {
  beatToCharacterLine,
  getBeatsForScenes,
  getLinesForScenes,
  parseSceneKey,
  sceneKey,
} from '../lib/script'
import { spokenDialogue } from '../lib/speech'
import type { InputMode, ProgressState, ScriptBeat } from '../types'

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

const AUTO_MS = 1800

export function Rehearsal({
  character,
  sceneKeys,
  mode,
  progress,
  onProgressChange,
  onExit,
  onFinished,
}: Props) {
  const beats = useMemo(
    () => getBeatsForScenes(character, sceneKeys),
    [character, sceneKeys],
  )
  const yourLines = useMemo(
    () => getLinesForScenes(character, sceneKeys),
    [character, sceneKeys],
  )

  const [cursor, setCursor] = useState(0)
  const [revealed, setRevealed] = useState<ScriptBeat[]>([])
  const [autoPlay, setAutoPlay] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const charProg = getCharacterProgress(progress, character)
  const {
    speaking,
    loading: voiceLoading,
    ready: voiceReady,
    progress: voiceProgress,
    speak,
    cancel,
  } = useSpeechSynthesis(mode === 'voice')
  const voiceCue = mode === 'voice' && voiceReady

  const beat = beats[cursor]
  const waitingForYou = Boolean(beat?.isYou)

  const yourDone = useMemo(() => {
    const mem = new Set(charProg.memorized)
    return yourLines.filter((l) => mem.has(l.id)).length
  }, [charProg.memorized, yourLines])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [revealed.length, waitingForYou, cursor])

  useEffect(() => {
    if (!beat || waitingForYou) {
      cancel()
      return undefined
    }

    if (mode === 'voice' && (voiceLoading || !voiceReady)) {
      return undefined
    }

    const canSpeak =
      voiceCue && !beat.isRubric && Boolean(spokenDialogue(beat.text))

    if (canSpeak) {
      let cancelled = false
      let followUp: number | undefined
      speak(beat.text, beat.speaker).then((outcome) => {
        if (cancelled || !autoPlay) return
        const delay = outcome === 'spoke' ? 400 : AUTO_MS
        followUp = window.setTimeout(() => {
          if (!cancelled) revealAndAdvance()
        }, delay)
      })
      return () => {
        cancelled = true
        if (followUp !== undefined) window.clearTimeout(followUp)
        cancel()
      }
    }

    if (!autoPlay) return undefined
    const timer = window.setTimeout(() => {
      revealAndAdvance()
    }, AUTO_MS)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- advance via stable helpers
  }, [beat?.id, waitingForYou, autoPlay, cursor, voiceCue, voiceLoading, voiceReady, mode])

  function finishIfDone(nextIndex: number) {
    if (nextIndex >= beats.length) {
      onFinished()
      return true
    }
    return false
  }

  function markSceneIfLeaving(fromIndex: number) {
    const current = beats[fromIndex]
    if (!current) return
    const next = beats[fromIndex + 1]
    const leaving =
      !next ||
      next.actId !== current.actId ||
      next.scene !== current.scene
    if (leaving) {
      onProgressChange((prev) =>
        markSceneComplete(prev, character, sceneKey(current.actId, current.scene)),
      )
    }
  }

  function revealAndAdvance() {
    const current = beats[cursor]
    if (!current) return
    setRevealed((prev) => [...prev, current])
    markSceneIfLeaving(cursor)
    const next = cursor + 1
    if (finishIfDone(next)) return
    setCursor(next)
  }

  function onYourAnswer(markDone: boolean) {
    const current = beats[cursor]
    if (!current?.isYou) return
    if (markDone) {
      onProgressChange((prev) => markMemorized(prev, character, current.id))
    }
    setRevealed((prev) => [...prev, current])
    markSceneIfLeaving(cursor)
    const next = cursor + 1
    if (finishIfDone(next)) return
    setCursor(next)
  }

  if (!beats.length) {
    return (
      <div className="rehearsal">
        <p>Nenhuma fala nas cenas escolhidas.</p>
        <button type="button" className="btn btn--primary" onClick={onExit}>
          Voltar
        </button>
      </div>
    )
  }

  if (!beat) return null

  const line = waitingForYou
    ? beatToCharacterLine(beat, character)
    : null
  const sceneLabel = `${beat.actLabel} · Cena ${beat.scene}`
  const scenePos =
    sceneKeys.findIndex((k) => k === sceneKey(beat.actId, beat.scene)) + 1

  let lastSceneKey = ''

  return (
    <div className="rehearsal">
      <header className="rehearsal__bar">
        <button type="button" className="btn btn--ghost" onClick={onExit}>
          Sair
        </button>
        <div className="rehearsal__status">
          <strong>{character}</strong>
          <span>
            {sceneLabel} · {scenePos}/{sceneKeys.length}
          </span>
          <span>
            Suas falas {yourDone}/{yourLines.length}
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

      {mode === 'voice' && voiceLoading && (
        <p className="voice-prep" role="status">
          Preparando voz natural…
          <span
            className="voice-prep__bar"
            aria-hidden
          >
            <span style={{ width: `${Math.round(voiceProgress * 100)}%` }} />
          </span>
        </p>
      )}

      <div className="rehearsal__feed" aria-live="polite">
        {revealed.map((b) => {
          const key = sceneKey(b.actId, b.scene)
          const showDivider = key !== lastSceneKey
          lastSceneKey = key
          return (
            <div key={`rev-${b.id}`}>
              {showDivider && (
                <p className="scene-divider">
                  {b.actLabel} · Cena {b.scene}
                </p>
              )}
              <SpeechBubble beat={b} />
            </div>
          )
        })}

        {waitingForYou && line && (
          <LinePrompt
            key={beat.id}
            line={line}
            character={character}
            mode={mode}
            attemptCount={charProg.attempts[beat.id] ?? 0}
            alreadyMemorized={charProg.memorized.includes(beat.id)}
            hideCue
            onAttempt={() =>
              onProgressChange((prev) =>
                recordAttempt(prev, character, beat.id),
              )
            }
            onCorrect={() => onYourAnswer(true)}
            onSkip={() => onYourAnswer(false)}
          />
        )}

        {!waitingForYou && (
          <>
            {revealed.length === 0 ||
            sceneKey(revealed[revealed.length - 1].actId, revealed[revealed.length - 1].scene) !==
              sceneKey(beat.actId, beat.scene) ? (
              <p className="scene-divider">
                {beat.actLabel} · Cena {beat.scene}
              </p>
            ) : null}
            <SpeechBubble beat={beat} highlight speaking={speaking} />
          </>
        )}

        <div ref={bottomRef} />
      </div>

      {!waitingForYou && (
        <div className="rehearsal__controls">
          <button
            type="button"
            className="btn btn--primary btn--block"
            onClick={revealAndAdvance}
          >
            {speaking ? 'Pular fala' : 'Próxima fala'}
          </button>
        </div>
      )}

      <p className="rehearsal__nav-hint">
        Próximas cenas:{' '}
        {sceneKeys
          .slice(scenePos)
          .map((k) => parseSceneKey(k).scene)
          .join(', ') || '—'}
      </p>
    </div>
  )
}
