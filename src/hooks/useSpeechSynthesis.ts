import { useCallback, useEffect, useRef, useState } from 'react'
import { hasAiTtsKey, onAiTtsKeyChange } from '../lib/aiTts'
import {
  cancelSpeech,
  ensureNeuralTts,
  isNeuralTtsReady,
  isSpeechSynthesisSupported,
  onTtsProgress,
  speakLine,
} from '../lib/speech'

export function useSpeechSynthesis(enabled = true) {
  const supported = isSpeechSynthesisSupported()
  const [speaking, setSpeaking] = useState(false)
  const [usingAi, setUsingAi] = useState(() => hasAiTtsKey())
  const [loading, setLoading] = useState(
    () => enabled && supported && !hasAiTtsKey() && !isNeuralTtsReady(),
  )
  const [ready, setReady] = useState(() => hasAiTtsKey() || isNeuralTtsReady())
  const [progress, setProgress] = useState(hasAiTtsKey() ? 1 : 0)
  const genRef = useRef(0)

  useEffect(() => {
    return onAiTtsKeyChange(() => {
      const ai = hasAiTtsKey()
      setUsingAi(ai)
      if (ai) {
        setReady(true)
        setLoading(false)
        setProgress(1)
      }
    })
  }, [])

  useEffect(() => {
    if (!enabled || !supported) return undefined
    if (hasAiTtsKey()) {
      setUsingAi(true)
      setReady(true)
      setLoading(false)
      setProgress(1)
      return undefined
    }

    let cancelled = false
    setUsingAi(false)
    setLoading(true)
    const unsub = onTtsProgress((p) => {
      if (!cancelled) setProgress(p.progresso)
    })
    void ensureNeuralTts().then((engine) => {
      if (cancelled) return
      setReady(Boolean(engine) || supported)
      setLoading(false)
    })
    return () => {
      cancelled = true
      unsub()
      cancelSpeech()
    }
  }, [enabled, supported, usingAi])

  const speak = useCallback(async (text: string, speaker?: string | null) => {
    const gen = ++genRef.current
    setSpeaking(true)
    try {
      return await speakLine({ text, speaker })
    } finally {
      if (gen === genRef.current) setSpeaking(false)
    }
  }, [])

  const cancel = useCallback(() => {
    genRef.current += 1
    setSpeaking(false)
    cancelSpeech()
  }, [])

  return { supported, speaking, loading, ready, progress, usingAi, speak, cancel }
}
