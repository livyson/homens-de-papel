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
  const finalRef = useRef('')
  const disposedRef = useRef(false)
  const fatalRef = useRef(false)

  useEffect(() => {
    onFinalRef.current = onFinal
    onInterimRef.current = onInterim
  }, [onFinal, onInterim])

  useEffect(() => {
    if (!supported) return
    disposedRef.current = false
    const rec = createRecognizer()
    if (!rec) return
    recRef.current = rec

    rec.onresult = (event) => {
      let interim = ''
      const startAt = event.resultIndex ?? 0
      for (let i = startAt; i < event.results.length; i++) {
        const result = event.results[i]
        const piece = result[0]?.transcript ?? ''
        if (result.isFinal) {
          finalRef.current = `${finalRef.current} ${piece}`.trim()
        } else {
          interim += piece
        }
      }
      const live = `${finalRef.current} ${interim}`.trim()
      if (live) onInterimRef.current?.(live)
    }

    rec.onerror = (event) => {
      if (event.error === 'aborted' || event.error === 'no-speech') {
        setListening(false)
        return
      }
      fatalRef.current = true
      setError(
        event.error === 'not-allowed'
          ? 'Permissão de microfone negada.'
          : event.error === 'network'
            ? 'O reconhecimento de voz não respondeu. Confira a conexão ou digite a fala.'
            : event.error === 'audio-capture'
              ? 'Não encontrei um microfone neste aparelho.'
              : event.error === 'service-not-allowed'
                ? 'O reconhecimento de voz está bloqueado neste navegador.'
                : event.error === 'language-not-supported'
                  ? 'Este navegador não reconhece português.'
                  : 'Não foi possível ouvir a fala. Tente de novo ou digite.',
      )
      setListening(false)
    }

    rec.onend = () => {
      setListening(false)
      if (disposedRef.current) return
      const text = finalRef.current.trim()
      const fatal = fatalRef.current
      finalRef.current = ''
      fatalRef.current = false
      if (fatal || !text) return
      onFinalRef.current(text)
    }

    return () => {
      disposedRef.current = true
      finalRef.current = ''
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
    finalRef.current = ''
    fatalRef.current = false
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
