import { useMemo, useState } from 'react'
import {
  fridoTurnIndexes,
  sceneSummary,
  scenes,
} from '../lib/scenes'
import { clearProgress, getSceneAttempts } from '../lib/progress'
import { isSpeechSupported } from '../lib/speech'
import type { InputMode, ProgressState, SessionConfig } from '../types'

type Props = {
  progress: ProgressState
  voiceNoticeShown: boolean
  onDismissVoiceNotice: () => void
  onStart: (config: SessionConfig) => void
  onProgressChange: (next: ProgressState) => void
}

export function SceneSelect({
  progress,
  voiceNoticeShown,
  onDismissVoiceNotice,
  onStart,
  onProgressChange,
}: Props) {
  const speechOk = useMemo(() => isSpeechSupported(), [])
  const [selected, setSelected] = useState<string[]>([])
  const [mode, setMode] = useState<InputMode>(speechOk ? 'voice' : 'type')

  function toggle(scene: string) {
    setSelected((prev) =>
      prev.includes(scene) ? prev.filter((s) => s !== scene) : [...prev, scene],
    )
  }

  function selectAll() {
    setSelected(scenes.map((s) => s.scene))
  }

  function clearSelection() {
    setSelected([])
  }

  function handleStart() {
    if (!selected.length) return
    const ordered = scenes
      .map((s) => s.scene)
      .filter((id) => selected.includes(id))
    onStart({ scenes: ordered, mode })
  }

  return (
    <div className="home">
      <header className="hero">
        <p className="hero__brand">Homens de Papel</p>
        <h1 className="hero__title">Ensaio do Frido</h1>
        <p className="hero__sub">
          Escolha as cenas, decore as falas. Os outros personagens ficam na tela;
          você responde só quando for o Frido.
        </p>
      </header>

      {!speechOk && !voiceNoticeShown && (
        <aside className="notice" role="status">
          <p>
            Neste navegador o reconhecimento de voz não está disponível. Dá
            para ensaiar digitando normalmente.
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
              value="type"
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
              value="voice"
              checked={mode === 'voice'}
              disabled={!speechOk}
              onChange={() => setMode('voice')}
            />
            Falar
            {!speechOk && <span className="mode__tag">indisponível</span>}
          </label>
        </div>
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2 className="panel__title">Cenas do Frido</h2>
          <div className="panel__actions">
            <button type="button" className="btn btn--ghost" onClick={selectAll}>
              Todas
            </button>
            <button type="button" className="btn btn--ghost" onClick={clearSelection}>
              Limpar
            </button>
          </div>
        </div>

        <ul className="scene-list">
          {scenes.map((scene) => {
            const id = scene.scene
            const indexes = fridoTurnIndexes(scene)
            const tries = getSceneAttempts(progress, id, indexes)
            const done = progress.completedScenes.includes(id)
            const checked = selected.includes(id)

            return (
              <li key={id}>
                <label className={`scene-item ${checked ? 'is-on' : ''} ${done ? 'is-done' : ''}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(id)}
                  />
                  <span className="scene-item__body">
                    <span className="scene-item__name">Cena {id}</span>
                    <span className="scene-item__meta">
                      {sceneSummary(scene)}
                      {tries > 0 ? ` · ${tries} tentativas` : ''}
                      {done ? ' · concluída' : ''}
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
          Começar ensaio
          {selected.length ? ` (${selected.length})` : ''}
        </button>
        {progress.completedScenes.length > 0 && (
          <button
            type="button"
            className="btn btn--ghost btn--block"
            onClick={() => onProgressChange(clearProgress())}
          >
            Zerar progresso salvo
          </button>
        )}
      </footer>
    </div>
  )
}
