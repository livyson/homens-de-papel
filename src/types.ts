export type FalaRaw = {
  personagem: string | null
  fala: string
  tipo?: string
}

export type CenaRaw = {
  cena: string
  falas: FalaRaw[]
}

export type PlayRaw = {
  titulo: string
  autor: string
  elenco: Record<string, string>
  atos: Record<string, CenaRaw[]>
}

export type CastMember = {
  /** Chave no elenco JSON, ex: "COCO" */
  elencoKey: string
  /** Nome do ator/atriz, ex: "Tiago" */
  actor: string
  /** Nome do personagem como no roteiro, ex: "Coco" */
  character: string
  lineCount: number
  /** Cenas em que o personagem tem fala */
  sceneCount: number
}

export type ActId = string

export type SceneRef = {
  actId: ActId
  actLabel: string
  scene: string
}

/** Uma fala do personagem escolhido, com deixa. */
export type CharacterLine = {
  id: string
  actId: ActId
  actLabel: string
  scene: string
  /** Índice da fala no array da cena */
  falaIndex: number
  /** Índice entre as falas deste personagem (0-based, global na peça) */
  characterLineIndex: number
  text: string
  /** Fala anterior de outro personagem (deixa/gancho) */
  cue: {
    speaker: string
    text: string
  } | null
  /** Rubricas imediatamente ligadas a esta fala, se houver */
  directions: string[]
}

export type InputMode = 'type' | 'voice'

export type WordMark = {
  word: string
  status: 'match' | 'miss' | 'extra' | 'missing'
}

export type CompareResult = {
  ok: boolean
  expectedWords: string[]
  actualWords: string[]
  marks: WordMark[]
}

export type CharacterProgress = {
  memorized: string[]
  attempts: Record<string, number>
  completedScenes: string[]
}

export type ProgressState = {
  version: 2
  byCharacter: Record<string, CharacterProgress>
  lastCharacter?: string
  updatedAt: string
}

export type SessionConfig = {
  character: string
  sceneKeys: string[]
  mode: InputMode
}
