import { useEffect, useId, useState, type FormEvent } from 'react'
import { DiffFeedback } from './DiffFeedback'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { compareLines } from '../lib/normalize'
import type { CharacterLine, CompareResult, InputMode } from '../types'

type Props = {
  line: CharacterLine
  character: string
  mode: InputMode
  attemptCount: number
  alreadyMemorized: boolean
  /** Quando a deixa já aparece nos balões da peça corrida */
  hideCue?: boolean
  onCorrect: () => void
  onSkip: () => void
  onAttempt: () => void
}

export function LinePrompt({
  line,
  character,
  mode,
  attemptCount,
  alreadyMemorized,
  hideCue = false,
  onCorrect,
  onSkip,
  onAttempt,
}: Props) {
  const expected = line.text
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
  }, [line.id])

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
      <div className="frido__badge">Sua vez — {character}</div>
      <p className="frido__meta">
        {line.actLabel} · Cena {line.scene}
        {alreadyMemorized ? ' · já decorada' : ''}
        {' · '}tentativas: <strong>{attemptCount}</strong>
      </p>

      {!hideCue && (
        <div className="cue">
          <p className="cue__label">Deixa</p>
          {line.cue ? (
            <>
              <p className="cue__speaker">{line.cue.speaker}</p>
              <p className="cue__text">“{line.cue.text}”</p>
            </>
          ) : (
            <p className="cue__text cue__text--empty">
              (Sem deixa — primeira fala da cena ou abertura)
            </p>
          )}
        </div>
      )}

      {!hideCue && line.directions.length > 0 && (
        <p className="frido__dir">({line.directions.join(' ')})</p>
      )}

      <p className="frido__cue">
        {hideCue
          ? 'Sua fala — responda de memória.'
          : 'Modo cego — produza a fala de memória.'}
      </p>

      {mode === 'type' ? (
        <form className="frido__form" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor={inputId}>
            Digite a fala de {character}
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
            <p className="frido__transcript">{interim || value}</p>
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
