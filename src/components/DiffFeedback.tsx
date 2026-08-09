import type { CompareResult } from '../types'

type Props = {
  result: CompareResult
  expected: string
}

export function DiffFeedback({ result, expected }: Props) {
  if (result.ok) return null

  return (
    <div className="diff" role="status" aria-live="polite">
      <p className="diff__title">Ainda não ficou com o mesmo sentido:</p>
      <p className="diff__row">
        <span className="diff__label">Você</span>
        <span className="diff__words">
          {result.marks.length === 0 ? (
            <span className="word word--missing">(vazio)</span>
          ) : (
            result.marks.map((m, i) => (
              <span key={`${m.word}-${i}`} className={`word word--${m.status}`}>
                {m.status === 'missing' ? `[${m.word}]` : m.word}
              </span>
            ))
          )}
        </span>
      </p>
      <p className="diff__hint">
        Verde ≈ bateu. Vermelho = a mais / fora do sentido. Entre colchetes =
        ideia que faltou. Ordem e sinônimos próximos são aceitos.
      </p>
      <details className="diff__peek">
        <summary>Ver fala esperada (sem pular)</summary>
        <p className="diff__expected">{expected}</p>
      </details>
    </div>
  )
}
