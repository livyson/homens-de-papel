type Props = {
  character: string
  sceneCount: number
  onAgain: () => void
  onScenes: () => void
  onCast: () => void
}

export function SessionDone({
  character,
  sceneCount,
  onAgain,
  onScenes,
  onCast,
}: Props) {
  return (
    <div className="done">
      <p className="done__brand">Homens de Papel</p>
      <h1 className="done__title">Ensaio concluído</h1>
      <p className="done__sub">
        Você passou por {sceneCount} cena{sceneCount === 1 ? '' : 's'} como{' '}
        <strong>{character}</strong>. O progresso de falas decoradas ficou
        salvo neste navegador.
      </p>
      <div className="done__actions">
        <button type="button" className="btn btn--primary" onClick={onAgain}>
          Repetir esta seleção
        </button>
        <button type="button" className="btn btn--ghost" onClick={onScenes}>
          Outras cenas de {character}
        </button>
        <button type="button" className="btn btn--ghost" onClick={onCast}>
          Trocar personagem
        </button>
      </div>
    </div>
  )
}
