export type Turn = {
  speaker: string | null
  text?: string
  directions?: string[]
}

export type Scene = {
  scene: string
  turns: Turn[]
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

export type AttemptKey = string

export type ProgressState = {
  completedScenes: string[]
  attempts: Record<AttemptKey, number>
  updatedAt: string
}

export type SessionConfig = {
  scenes: string[]
  mode: InputMode
}
