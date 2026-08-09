import { useEffect, useId, useState, type FormEvent } from 'react'
import { DiffFeedback } from './DiffFeedback'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { compareLines } from '../lib/normalize'
import type { CompareResult, InputMode, Turn } from '../types'

type Props = {
  turn: Turn
  mode: InputMode
  attemptCount: number
  onCorrect: () => void
  onSkip: () => void
  onAttempt: () => void
}

export function FridoPrompt({
  turn,
  mode,
  attemptCount,
  onCorrect,
  onSkip,
  onAttempt,
}: Props) {
  const expected = turn.text ?? ''
  const inputId = useId()
  const [value, setValue] = useState('')
  const [interim, setInterim] = useState('')
  const [result, setResult] = useState<CompareResult | null>(null)
  const [revealed, setRevealed] = useState(false)

  const { listening, error, start, stop } = useSpeechRecognition({
    onFinal: (transcript) => {
      setValue(transcript)
      setInterim('')
      check(transcript)
    },
    onInterim: setInterim,
  })

  useEffect(() => {
    setValue('')
    setInterim('')
    setResult(null)
    setRevealed(false)
  }, [expected])

  function check(raw: string) {
    onAttempt()
    const cmp = compareLines(expected, raw)
    setResult(cmp)
    if (cmp.ok) {
      window.setTimeout(() => onCorrect(), 450)
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    check(value)
  }

  return (
    <section className="frido" aria-labelledby={inputId}>
      <div className="frido__badge">Sua vez — Frido</div>
      {turn.directions?.map((d, i) => (
        <p key={i} className="frido__dir">
          ({d})
        </p>
      ))}
      <p className="frido__cue">Produza a fala de cor.</p>
      <p className="frido__meta">
        Tentativas nesta fala: <strong>{attemptCount}</strong>
      </p>

      {mode === 'type' ? (
        <form className="frido__form" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor={inputId}>
            Digite a fala do Frido
          </label>
          <textarea
            id={inputId}
            className="frido__input"
            rows={3}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Digite a fala…"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="done"
          />
          <button type="submit" className="btn btn--primary" disabled={!value.trim()}>
            Conferir
          </button>
        </form>
      ) : (
        <div className="frido__voice">
          <button
            type="button"
            className={`mic ${listening ? 'mic--on' : ''}`}
            onClick={() => (listening ? stop() : start())}
            aria-pressed={listening}
          >
            <span className="mic__icon" aria-hidden />
            {listening ? 'Ouvindo… toque para parar' : 'Toque para falar'}
          </button>
          {(interim || value) && (
            <p className="frido__transcript">
              {interim || value}
            </p>
          )}
          {error && <p className="frido__error">{error}</p>}
          {value && !listening && (
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => check(value)}
            >
              Conferir de novo
            </button>
          )}
        </div>
      )}

      {result?.ok && <p className="frido__ok">Certo! Seguindo…</p>}
      {result && !result.ok && !revealed && (
        <DiffFeedback result={result} expected={expected} />
      )}

      {revealed && (
        <div className="frido__reveal">
          <p className="frido__reveal-label">Resposta</p>
          <p className="frido__reveal-text">{expected}</p>
          <button type="button" className="btn btn--primary" onClick={onSkip}>
            Continuar
          </button>
        </div>
      )}

      {!revealed && (
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => {
            onAttempt()
            setRevealed(true)
          }}
        >
          Ver resposta e pular
        </button>
      )}
    </section>
  )
}
