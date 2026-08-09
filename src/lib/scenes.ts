import roteiro from '../data/roteiro-frido.json'
import type { Scene, Turn } from '../types'

export const scenes = roteiro as Scene[]

export function getScene(id: string): Scene | undefined {
  return scenes.find((s) => s.scene === id)
}

export function fridoTurnIndexes(scene: Scene): number[] {
  return scene.turns
    .map((t, i) => (t.speaker === 'Frido' ? i : -1))
    .filter((i) => i >= 0)
}

export function countFridoLines(scene: Scene): number {
  return fridoTurnIndexes(scene).length
}

export function isFridoTurn(turn: Turn): boolean {
  return turn.speaker === 'Frido'
}

export function sceneSummary(scene: Scene): string {
  const n = countFridoLines(scene)
  return `${n} fala${n === 1 ? '' : 's'} do Frido`
}
