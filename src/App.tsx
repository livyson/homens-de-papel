import { useState } from 'react'
import { Rehearsal } from './components/Rehearsal'
import { SceneSelect } from './components/SceneSelect'
import { SessionDone } from './components/SessionDone'
import { loadProgress } from './lib/progress'
import { isSpeechSupported } from './lib/speech'
import type { ProgressState, SessionConfig } from './types'

const VOICE_NOTICE_KEY = 'homens-de-papel:voice-notice-dismissed'

type Screen = 'home' | 'rehearsal' | 'done'

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [progress, setProgress] = useState<ProgressState>(() => loadProgress())
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

  function start(config: SessionConfig) {
    setSession(config)
    setScreen('rehearsal')
  }

  if (screen === 'rehearsal' && session) {
    return (
      <Rehearsal
        sceneIds={session.scenes}
        mode={session.mode}
        progress={progress}
        onProgressChange={setProgress}
        onExit={() => setScreen('home')}
        onFinished={() => setScreen('done')}
      />
    )
  }

  if (screen === 'done' && session) {
    return (
      <SessionDone
        sceneIds={session.scenes}
        onAgain={() => setScreen('rehearsal')}
        onHome={() => setScreen('home')}
      />
    )
  }

  return (
    <SceneSelect
      progress={progress}
      voiceNoticeShown={voiceNoticeDismissed || isSpeechSupported()}
      onDismissVoiceNotice={dismissVoiceNotice}
      onStart={start}
      onProgressChange={setProgress}
    />
  )
}
