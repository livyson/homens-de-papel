import type { Turn } from '../types'

type Props = {
  turn: Turn
  highlight?: boolean
}

export function TurnCard({ turn, highlight }: Props) {
  const isRubric = !turn.speaker
  const label = isRubric ? 'Rubrica' : turn.speaker

  return (
    <article
      className={[
        'turn',
        isRubric ? 'turn--rubric' : '',
        highlight ? 'turn--you' : '',
        turn.speaker === 'Frido' ? 'turn--frido' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <header className="turn__speaker">{label}</header>
      {turn.directions?.map((d, i) => (
        <p key={i} className="turn__dir">
          ({d})
        </p>
      ))}
      {turn.text ? <p className="turn__text">{turn.text}</p> : null}
    </article>
  )
}
