type Props = {
  sceneIds: string[]
  onAgain: () => void
  onHome: () => void
}

export function SessionDone({ sceneIds, onAgain, onHome }: Props) {
  return (
    <div className="done">
      <p className="done__brand">Homens de Papel</p>
      <h1 className="done__title">Ensaio concluído</h1>
      <p className="done__sub">
        Você passou por {sceneIds.length} cena
        {sceneIds.length === 1 ? '' : 's'}:{' '}
        {sceneIds.map((s) => s).join(', ')}.
      </p>
      <div className="done__actions">
        <button type="button" className="btn btn--primary" onClick={onAgain}>
          Repetir esta seleção
        </button>
        <button type="button" className="btn btn--ghost" onClick={onHome}>
          Escolher outras cenas
        </button>
      </div>
    </div>
  )
}
