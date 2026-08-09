import { useEffect, useRef, useState } from 'react'
import { createRecognizer, isSpeechSupported } from '../lib/speech'

type Options = {
  onFinal: (transcript: string) => void
  onInterim?: (transcript: string) => void
}

export function useSpeechRecognition({ onFinal, onInterim }: Options) {
  const supported = isSpeechSupported()
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const onFinalRef = useRef(onFinal)
  const onInterimRef = useRef(onInterim)
  const recRef = useRef<ReturnType<typeof createRecognizer>>(null)

  useEffect(() => {
    onFinalRef.current = onFinal
    onInterimRef.current = onInterim
  }, [onFinal, onInterim])

  useEffect(() => {
    if (!supported) return
    const rec = createRecognizer()
    if (!rec) return
    recRef.current = rec

    rec.onresult = (event) => {
      let interim = ''
      let finalText = ''
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]
        const piece = result[0]?.transcript ?? ''
        if (result.isFinal) finalText += piece
        else interim += piece
      }
      if (interim) onInterimRef.current?.(interim)
      if (finalText.trim()) onFinalRef.current(finalText.trim())
    }

    rec.onerror = (event) => {
      if (event.error === 'aborted' || event.error === 'no-speech') {
        setListening(false)
        return
      }
      setError(
        event.error === 'not-allowed'
          ? 'Permissão de microfone negada.'
          : `Erro de voz: ${event.error}`,
      )
      setListening(false)
    }

    rec.onend = () => setListening(false)

    return () => {
      try {
        rec.abort()
      } catch {
        /* ignore */
      }
      recRef.current = null
    }
  }, [supported])

  const start = () => {
    if (!recRef.current || listening) return
    setError(null)
    try {
      recRef.current.start()
      setListening(true)
    } catch {
      setError('Não foi possível iniciar o microfone.')
      setListening(false)
    }
  }

  const stop = () => {
    if (!recRef.current) return
    try {
      recRef.current.stop()
    } catch {
      /* ignore */
    }
  }

  return { supported, listening, error, start, stop }
}
