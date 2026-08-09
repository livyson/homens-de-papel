import { getCast, play } from '../lib/script'
import type { ProgressState } from '../types'
import { getCharacterProgress } from '../lib/progress'

type Props = {
  progress: ProgressState
  onSelect: (character: string) => void
}

export function CharacterSelect({ progress, onSelect }: Props) {
  const cast = getCast()

  return (
    <div className="home">
      <header className="hero">
        <p className="hero__brand">{play.titulo}</p>
        <h1 className="hero__title">Ensaio de elenco</h1>
        <p className="hero__sub">
          Escolha o seu personagem. O app mostra só as suas falas, com a deixa
          anterior, para treinar de cor.
        </p>
        <p className="hero__meta">{play.autor}</p>
      </header>

      <section className="panel">
        <h2 className="panel__title">Elenco</h2>
        <ul className="cast-list">
          {cast.map((member) => {
            const prog = getCharacterProgress(progress, member.character)
            const done = prog.memorized.length
            return (
              <li key={member.elencoKey}>
                <button
                  type="button"
                  className="cast-item"
                  onClick={() => onSelect(member.character)}
                >
                  <span className="cast-item__actor">{member.actor}</span>
                  <span className="cast-item__role">= {member.character}</span>
                  <span className="cast-item__meta">
                    {member.lineCount} falas
                    {done > 0 ? ` · ${done} decoradas` : ''}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
