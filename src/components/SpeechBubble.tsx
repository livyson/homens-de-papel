import type { ScriptBeat } from '../types'

type Props = {
  beat: ScriptBeat
  highlight?: boolean
  speaking?: boolean
}

export function SpeechBubble({ beat, highlight, speaking }: Props) {
  if (beat.isRubric) {
    const text = beat.text.trim()
    const shown = text.startsWith('(') && text.endsWith(')') ? text : `(${text})`
    return (
      <div className={`bubble bubble--rubric ${highlight ? 'is-new' : ''}`}>
        <p>{shown}</p>
      </div>
    )
  }

  return (
    <article
      className={[
        'bubble',
        beat.isYou ? 'bubble--you' : 'bubble--other',
        highlight ? 'is-new' : '',
        speaking ? 'is-speaking' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <header className="bubble__speaker">
        {beat.isYou ? `Você (${beat.speaker})` : beat.speaker}
        {speaking && <span className="bubble__live">Falando</span>}
      </header>
      <p className="bubble__text">{beat.text}</p>
    </article>
  )
}
