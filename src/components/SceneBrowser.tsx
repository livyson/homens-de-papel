import { useMemo, useState } from 'react'
import {
  clearCharacterProgress,
  countMemorizedIn,
  getCharacterProgress,
} from '../lib/progress'
import { isSpeechSupported } from '../lib/speech'
import {
  actsForCharacter,
  getCastMember,
  sceneKey,
  scenesForCharacter,
} from '../lib/script'
import type { InputMode, ProgressState, SessionConfig } from '../types'

type Props = {
  character: string
  progress: ProgressState
  voiceNoticeShown: boolean
  onDismissVoiceNotice: () => void
  onBack: () => void
  onStart: (config: SessionConfig) => void
  onProgressChange: (next: ProgressState) => void
}

export function SceneBrowser({
  character,
  progress,
  voiceNoticeShown,
  onDismissVoiceNotice,
  onBack,
  onStart,
  onProgressChange,
}: Props) {
  const speechOk = useMemo(() => isSpeechSupported(), [])
  const member = getCastMember(character)
  const scenes = useMemo(() => scenesForCharacter(character), [character])
  const acts = useMemo(() => actsForCharacter(character), [character])
  const charProg = getCharacterProgress(progress, character)

  const [selected, setSelected] = useState<string[]>([])
  const [mode, setMode] = useState<InputMode>(speechOk ? 'voice' : 'type')
  const [actFilter, setActFilter] = useState<string>('all')

  const visible = scenes.filter(
    (s) => actFilter === 'all' || s.actId === actFilter,
  )

  const totalLines = scenes.reduce((n, s) => n + s.lineCount, 0)
  const totalMemorized = countMemorizedIn(
    progress,
    character,
    scenes.flatMap((s) => s.lineIds),
  )

  function toggle(key: string) {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    )
  }

  function selectVisible() {
    setSelected(visible.map((s) => sceneKey(s.actId, s.scene)))
  }

  function handleStart() {
    if (!selected.length) return
    const ordered = scenes
      .map((s) => sceneKey(s.actId, s.scene))
      .filter((k) => selected.includes(k))
    onStart({ character, sceneKeys: ordered, mode })
  }

  return (
    <div className="home">
      <header className="hero hero--compact">
        <button type="button" className="btn btn--ghost" onClick={onBack}>
          ← Elenco
        </button>
        <p className="hero__brand hero__brand--sm">
          {member?.actor ?? 'Ator'} = {character}
        </p>
        <p className="hero__sub">
          {scenes.length} cena{scenes.length === 1 ? '' : 's'} com a sua
          participação · {totalMemorized}/{totalLines} falas decoradas
        </p>
      </header>

      {!speechOk && !voiceNoticeShown && (
        <aside className="notice" role="status">
          <p>
            Neste navegador o reconhecimento de voz não está disponível. Dá
            para ensaiar digitando.
          </p>
          <button type="button" className="btn btn--ghost" onClick={onDismissVoiceNotice}>
            Entendi
          </button>
        </aside>
      )}

      <section className="panel">
        <h2 className="panel__title">Modo de entrada</h2>
        <div className="mode" role="radiogroup" aria-label="Modo de entrada">
          <label className={`mode__opt ${mode === 'type' ? 'is-on' : ''}`}>
            <input
              type="radio"
              name="mode"
              checked={mode === 'type'}
              onChange={() => setMode('type')}
            />
            Digitar
          </label>
          <label
            className={`mode__opt ${mode === 'voice' ? 'is-on' : ''} ${!speechOk ? 'is-disabled' : ''}`}
          >
            <input
              type="radio"
              name="mode"
              checked={mode === 'voice'}
              disabled={!speechOk}
              onChange={() => setMode('voice')}
            />
            Falar
            {!speechOk && <span className="mode__tag">indisponível</span>}
          </label>
        </div>
        <p className="panel__hint">
          Modo cego: você vê só a deixa e produz a fala de memória.
        </p>
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2 className="panel__title">Suas cenas</h2>
          <div className="panel__actions">
            <button type="button" className="btn btn--ghost" onClick={selectVisible}>
              Todas
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setSelected([])}>
              Limpar
            </button>
          </div>
        </div>

        <p className="panel__hint">
          Só aparecem cenas em que {character} tem fala.
        </p>

        {acts.length > 1 && (
          <div className="act-tabs" role="tablist" aria-label="Filtro de ato">
            <button
              type="button"
              className={`act-tabs__btn ${actFilter === 'all' ? 'is-on' : ''}`}
              onClick={() => setActFilter('all')}
            >
              Todas
            </button>
            {acts.map((act) => (
              <button
                key={act.id}
                type="button"
                className={`act-tabs__btn ${actFilter === act.id ? 'is-on' : ''}`}
                onClick={() => setActFilter(act.id)}
              >
                {act.label}
              </button>
            ))}
          </div>
        )}

        <ul className="scene-list">
          {visible.length === 0 && (
            <li className="scene-item__empty">Nenhuma cena neste filtro.</li>
          )}
          {visible.map((s) => {
            const key = sceneKey(s.actId, s.scene)
            const memorized = countMemorizedIn(progress, character, s.lineIds)
            const done = charProg.completedScenes.includes(key)
            const checked = selected.includes(key)
            return (
              <li key={key}>
                <label className={`scene-item ${checked ? 'is-on' : ''} ${done ? 'is-done' : ''}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(key)}
                  />
                  <span className="scene-item__body">
                    <span className="scene-item__name">
                      {s.actLabel} · Cena {s.scene}
                    </span>
                    <span className="scene-item__meta">
                      {memorized}/{s.lineCount} decoradas
                      {done ? ' · concluída' : ''}
                    </span>
                    <span
                      className="scene-item__bar"
                      aria-hidden
                    >
                      <span
                        style={{
                          width: `${s.lineCount ? (memorized / s.lineCount) * 100 : 0}%`,
                        }}
                      />
                    </span>
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      </section>

      <footer className="home__footer">
        <button
          type="button"
          className="btn btn--primary btn--block"
          disabled={!selected.length}
          onClick={handleStart}
        >
          Começar ensaio cego
          {selected.length ? ` (${selected.length} cenas)` : ''}
        </button>
        {charProg.memorized.length > 0 && (
          <button
            type="button"
            className="btn btn--ghost btn--block"
            onClick={() =>
              onProgressChange(clearCharacterProgress(progress, character))
            }
          >
            Zerar progresso de {character}
          </button>
        )}
      </footer>
    </div>
  )
}
