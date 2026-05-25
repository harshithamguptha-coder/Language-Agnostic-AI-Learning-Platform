import { useEffect, useRef, useState } from 'react'

const initialState = {
  activeKey: null,
  status: 'idle',
  error: '',
  progress: 0,
  currentTime: 0,
  duration: 0,
}

export const useAudioPlayer = ({ buildAudio, getLanguage }) => {
  const audioRef = useRef(null)
  const objectUrlRef = useRef('')
  const requestIdRef = useRef(0)
  const [state, setState] = useState(initialState)

  // Keep only one browser Audio instance alive at a time.
  const cleanupCurrentAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = ''
    }
  }

  useEffect(() => {
    return cleanupCurrentAudio
  }, [])

  const attachAudio = (audio, activeKey) => {
    audioRef.current = audio

    audio.ontimeupdate = () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0
      const currentTime = audio.currentTime || 0
      setState((current) => ({
        ...current,
        currentTime,
        duration,
        progress: duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0,
      }))
    }

    audio.onended = () => {
      setState((current) => ({
        ...current,
        status: 'ended',
        progress: 100,
      }))
    }

    audio.onerror = () => {
      setState((current) => ({
        ...current,
        status: 'error',
        error: 'Unable to play this audio response.',
      }))
    }

    audio.onplay = () => {
      setState((current) => ({
        ...current,
        activeKey,
        status: 'playing',
        error: '',
      }))
    }

    audio.onpause = () => {
      setState((current) => {
        if (current.status === 'stopped' || current.status === 'ended') return current
        return { ...current, status: 'paused' }
      })
    }
  }

  const play = async (activeKey, text) => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    cleanupCurrentAudio()
    setState({
      ...initialState,
      activeKey,
      status: 'loading',
    })

    try {
      const language = getLanguage(text)
      const audioBlob = await buildAudio(text, language)
      if (requestId !== requestIdRef.current) return

      const audioUrl = URL.createObjectURL(audioBlob)
      objectUrlRef.current = audioUrl

      const audio = new Audio(audioUrl)
      attachAudio(audio, activeKey)
      await audio.play()
    } catch (error) {
      if (requestId !== requestIdRef.current) return
      cleanupCurrentAudio()
      setState({
        ...initialState,
        activeKey,
        status: 'error',
        error: error?.response?.data?.detail || error?.message || 'Unable to generate speech.',
      })
    }
  }

  const pause = () => {
    audioRef.current?.pause()
  }

  const resume = async () => {
    try {
      await audioRef.current?.play()
    } catch (error) {
      setState((current) => ({
        ...current,
        status: 'error',
        error: 'Unable to resume audio.',
      }))
    }
  }

  const stop = () => {
    requestIdRef.current += 1
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setState((current) => ({
      ...current,
      status: 'stopped',
      progress: 0,
      currentTime: 0,
    }))
  }

  const replay = async () => {
    if (!audioRef.current) return
    audioRef.current.currentTime = 0
    await resume()
  }

  return {
    audioState: state,
    play,
    pause,
    resume,
    stop,
    replay,
  }
}
