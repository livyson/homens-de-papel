import { useState } from 'react'
import { CharacterSelect } from './components/CharacterSelect'
import { Rehearsal } from './components/Rehearsal'
import { SceneBrowser } from './components/SceneBrowser'
import { SessionDone } from './components/SessionDone'
import { loadProgress, setLastCharacter } from './lib/progress'
import { isSpeechSupported } from './lib/speech'
import type { ProgressState, SessionConfig } from './types'

const VOICE_NOTICE_KEY = 'homens-de-papel:voice-notice-dismissed'

type Screen = 'cast' | 'scenes' | 'rehearsal' | 'done'

export default function App() {
  const [screen, setScreen] = useState<Screen>('cast')
  const [progress, setProgress] = useState<ProgressState>(() => loadProgress())
  const [character, setCharacter] = useState<string | null>(
    () => loadProgress().lastCharacter ?? null,
  )
  const [session, setSession] = useState<SessionConfig | null>(null)
  const [voiceNoticeDismissed, setVoiceNoticeDismissed] = useState(() => {
    try {
      return localStorage.getItem(VOICE_NOTICE_KEY) === '1'
    } catch {
      return false
    }
  })

  function dismissVoiceNotice() {
    setVoiceNoticeDismissed(true)
    try {
      localStorage.setItem(VOICE_NOTICE_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  function selectCharacter(name: string) {
    setCharacter(name)
    setProgress((prev) => setLastCharacter(prev, name))
    setScreen('scenes')
  }

  function start(config: SessionConfig) {
    setSession(config)
    setScreen('rehearsal')
  }

  if (screen === 'rehearsal' && session) {
    return (
      <Rehearsal
        character={session.character}
        sceneKeys={session.sceneKeys}
        mode={session.mode}
        progress={progress}
        onProgressChange={setProgress}
        onExit={() => setScreen('scenes')}
        onFinished={() => setScreen('done')}
      />
    )
  }

  if (screen === 'done' && session) {
    return (
      <SessionDone
        character={session.character}
        sceneCount={session.sceneKeys.length}
        onAgain={() => setScreen('rehearsal')}
        onScenes={() => setScreen('scenes')}
        onCast={() => setScreen('cast')}
      />
    )
  }

  if (screen === 'scenes' && character) {
    return (
      <SceneBrowser
        character={character}
        progress={progress}
        voiceNoticeShown={voiceNoticeDismissed || isSpeechSupported()}
        onDismissVoiceNotice={dismissVoiceNotice}
        onBack={() => setScreen('cast')}
        onStart={start}
        onProgressChange={setProgress}
      />
    )
  }

  return (
    <CharacterSelect progress={progress} onSelect={selectCharacter} />
  )
}
