import playJson from '../data/homens-de-papel.json'
import type {
  CastMember,
  CenaRaw,
  CharacterLine,
  PlayRaw,
  SceneRef,
  ScriptBeat,
} from '../types'

export const play = playJson as PlayRaw

const ACT_ORDER = ['PRIMEIRO ATO', 'SEGUNDO ATO'] as const

const ACT_LABELS: Record<string, string> = {
  'PRIMEIRO ATO': 'Ato I',
  'SEGUNDO ATO': 'Ato II',
}

function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

function allSpeakers(): string[] {
  const set = new Set<string>()
  for (const cenas of Object.values(play.atos)) {
    for (const cena of cenas) {
      for (const f of cena.falas) {
        if (f.personagem) set.add(f.personagem)
      }
    }
  }
  return [...set]
}

function resolveCharacter(elencoKey: string, speakers: string[]): string | null {
  const fk = fold(elencoKey)
  for (const s of speakers) {
    if (fold(s) === fk) return s
  }
  let best: { score: number; name: string } | null = null
  for (const s of speakers) {
    const fs = fold(s)
    if (!fs) continue
    if (fk === fs) return s
    if (fk.startsWith(fs) || fs.startsWith(fk) || fk.includes(fs) || fs.includes(fk)) {
      const score = Math.min(fk.length, fs.length)
      if (!best || score > best.score) best = { score, name: s }
    }
  }
  return best?.name ?? null
}

function countParticipation(character: string): {
  lineCount: number
  sceneCount: number
} {
  let lineCount = 0
  const scenes = new Set<string>()
  for (const [actId, cenas] of Object.entries(play.atos)) {
    for (const cena of cenas) {
      let inScene = false
      for (const f of cena.falas) {
        if (f.personagem === character) {
          lineCount += 1
          inScene = true
        }
      }
      if (inScene) scenes.add(sceneKey(actId, cena.cena))
    }
  }
  return { lineCount, sceneCount: scenes.size }
}

export function getActLabel(actId: string): string {
  return ACT_LABELS[actId] ?? actId
}

export function listActs(): { id: string; label: string }[] {
  return ACT_ORDER.filter((id) => play.atos[id]).map((id) => ({
    id,
    label: getActLabel(id),
  }))
}

export function listScenes(): SceneRef[] {
  const out: SceneRef[] = []
  for (const actId of ACT_ORDER) {
    const cenas = play.atos[actId]
    if (!cenas) continue
    for (const cena of cenas) {
      out.push({
        actId,
        actLabel: getActLabel(actId),
        scene: cena.cena,
      })
    }
  }
  return out
}

export function sceneKey(actId: string, scene: string): string {
  return `${actId}::${scene}`
}

export function parseSceneKey(key: string): { actId: string; scene: string } {
  const [actId, scene] = key.split('::')
  return { actId, scene }
}

export function getCast(): CastMember[] {
  const speakers = allSpeakers()
  const members: CastMember[] = []
  for (const [elencoKey, actor] of Object.entries(play.elenco)) {
    const character = resolveCharacter(elencoKey, speakers)
    if (!character) continue
    const { lineCount, sceneCount } = countParticipation(character)
    if (lineCount === 0) continue
    members.push({
      elencoKey,
      actor,
      character,
      lineCount,
      sceneCount,
    })
  }
  members.sort((a, b) => a.actor.localeCompare(b.actor, 'pt-BR'))
  return members
}

function findCue(
  falas: CenaRaw['falas'],
  index: number,
  character: string,
): CharacterLine['cue'] {
  for (let i = index - 1; i >= 0; i--) {
    const prev = falas[i]
    if (!prev.personagem) continue
    if (prev.personagem === character) {
      // deixa de si mesmo não serve; continua procurando outro
      continue
    }
    return { speaker: prev.personagem, text: prev.fala }
  }
  return null
}

function nearbyDirections(
  falas: CenaRaw['falas'],
  index: number,
): string[] {
  const dirs: string[] = []
  // rubricas logo antes da fala
  for (let i = index - 1; i >= 0; i--) {
    const f = falas[i]
    if (f.personagem) break
    if (f.fala?.trim()) dirs.unshift(f.fala.trim())
  }
  return dirs
}

export function getCharacterLines(character: string): CharacterLine[] {
  const lines: CharacterLine[] = []
  let characterLineIndex = 0

  for (const actId of ACT_ORDER) {
    const cenas = play.atos[actId]
    if (!cenas) continue
    for (const cena of cenas) {
      cena.falas.forEach((f, falaIndex) => {
        if (f.personagem !== character) return
        lines.push({
          id: `${actId}::${cena.cena}::${falaIndex}`,
          actId,
          actLabel: getActLabel(actId),
          scene: cena.cena,
          falaIndex,
          characterLineIndex,
          text: f.fala,
          cue: findCue(cena.falas, falaIndex, character),
          directions: nearbyDirections(cena.falas, falaIndex),
        })
        characterLineIndex += 1
      })
    }
  }

  return lines
}

export function getLinesForScenes(
  character: string,
  sceneKeys: string[],
): CharacterLine[] {
  const wanted = new Set(sceneKeys)
  return getCharacterLines(character).filter((l) =>
    wanted.has(sceneKey(l.actId, l.scene)),
  )
}

/** Peça corrida nas cenas escolhidas, na ordem do roteiro. */
export function getBeatsForScenes(
  character: string,
  sceneKeys: string[],
): ScriptBeat[] {
  const wanted = new Set(sceneKeys)
  const beats: ScriptBeat[] = []

  for (const actId of ACT_ORDER) {
    const cenas = play.atos[actId]
    if (!cenas) continue
    for (const cena of cenas) {
      const key = sceneKey(actId, cena.cena)
      if (!wanted.has(key)) continue
      cena.falas.forEach((f, falaIndex) => {
        const speaker = f.personagem
        const isRubric = !speaker
        beats.push({
          id: `${actId}::${cena.cena}::${falaIndex}`,
          actId,
          actLabel: getActLabel(actId),
          scene: cena.cena,
          falaIndex,
          speaker,
          text: f.fala,
          isYou: speaker === character,
          isRubric,
        })
      })
    }
  }

  return beats
}

export function beatToCharacterLine(
  beat: ScriptBeat,
  character: string,
): CharacterLine {
  const cena = play.atos[beat.actId]?.find((c) => c.cena === beat.scene)
  const falas = cena?.falas ?? []
  return {
    id: beat.id,
    actId: beat.actId,
    actLabel: beat.actLabel,
    scene: beat.scene,
    falaIndex: beat.falaIndex,
    characterLineIndex: 0,
    text: beat.text,
    cue: findCue(falas, beat.falaIndex, character),
    directions: nearbyDirections(falas, beat.falaIndex),
  }
}

/** Cenas em que o personagem tem pelo menos uma fala (participação no roteiro). */
export function scenesForCharacter(character: string): Array<
  SceneRef & { lineCount: number; lineIds: string[] }
> {
  const counts = new Map<string, { ref: SceneRef; ids: string[] }>()
  for (const line of getCharacterLines(character)) {
    const key = sceneKey(line.actId, line.scene)
    let entry = counts.get(key)
    if (!entry) {
      entry = {
        ref: {
          actId: line.actId,
          actLabel: line.actLabel,
          scene: line.scene,
        },
        ids: [],
      }
      counts.set(key, entry)
    }
    entry.ids.push(line.id)
  }

  // Ordem da peça; nunca inclui cenas sem fala do personagem.
  const ordered: Array<SceneRef & { lineCount: number; lineIds: string[] }> = []
  for (const ref of listScenes()) {
    const key = sceneKey(ref.actId, ref.scene)
    const entry = counts.get(key)
    if (!entry || entry.ids.length === 0) continue
    ordered.push({
      ...ref,
      lineCount: entry.ids.length,
      lineIds: entry.ids,
    })
  }
  return ordered
}

export function actsForCharacter(character: string): { id: string; label: string }[] {
  const actIds = new Set(scenesForCharacter(character).map((s) => s.actId))
  return listActs().filter((act) => actIds.has(act.id))
}

export function getCastMember(character: string): CastMember | undefined {
  return getCast().find((c) => c.character === character)
}
