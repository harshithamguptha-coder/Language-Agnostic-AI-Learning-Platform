const formatTime = (seconds) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00'
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, '0')
  return `${minutes}:${remainingSeconds}`
}

const AudioControls = ({
  isDark,
  status,
  error,
  progress,
  currentTime,
  duration,
  onPlay,
  onPause,
  onResume,
  onStop,
  onReplay,
}) => {
  // status: 'idle' | 'loading' | 'playing' | 'paused' | 'stopped' | 'ended' | 'error'
  const isLoading = status === 'loading'
  const isPlaying = status === 'playing'
  const isPaused = status === 'paused'
  const canControl = ['playing', 'paused', 'ended', 'stopped'].includes(status)

  // Simple style helper to keep the look consistent across themes.
  const buttonClass = isDark
    ? 'bg-slate-700 text-slate-100 hover:bg-slate-600'
    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'

  return (
    <div
      className={`mt-3 rounded-2xl border p-3 ${isDark ? 'border-slate-700 bg-slate-900/60' : 'border-slate-200 bg-slate-50'}`}
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onPlay}
          // Prevent overlapping playback by disabling Play while already playing or loading.
          disabled={isLoading || isPlaying}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${buttonClass}`}
        >
          {isLoading ? 'Loading...' : isPlaying ? 'Playing' : 'Play'}
        </button>
        <button
          type="button"
          onClick={onPause}
          disabled={!isPlaying}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${buttonClass}`}
        >
          Pause
        </button>
        <button
          type="button"
          onClick={onResume}
          disabled={!isPaused}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${buttonClass}`}
        >
          Resume
        </button>
        <button
          type="button"
          onClick={onStop}
          disabled={!canControl}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${buttonClass}`}
        >
          Stop
        </button>
        <button
          type="button"
          onClick={onReplay}
          disabled={!canControl}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${buttonClass}`}
        >
          Replay
        </button>

        {/* Speaking animation — simple three bars that animate while playing. */}
        <div className="ml-2 flex items-center gap-1">
          <div className={`h-3 w-0.5 rounded-sm bg-green-400 transition-all ${isPlaying ? 'animate-speak-1' : 'opacity-30'}`} />
          <div className={`h-4 w-0.5 rounded-sm bg-green-400 transition-all ${isPlaying ? 'animate-speak-2' : 'opacity-30'}`} />
          <div className={`h-5 w-0.5 rounded-sm bg-green-400 transition-all ${isPlaying ? 'animate-speak-3' : 'opacity-30'}`} />
        </div>
      </div>

      <div className="mt-3">
        <div className={`h-2 overflow-hidden rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
          <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${progress || 0}%` }} />
        </div>
        <div className={`mt-1 flex justify-between text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {isLoading && (
        <div className={`mt-2 flex items-center gap-2 text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          Generating speech...
        </div>
      )}
      {error && <div className="mt-2 text-xs font-medium text-red-400">{error}</div>}

      {/* Inline CSS keyframes for a subtle speaking animation. Kept local to avoid touching global styles. */}
      <style>{`
        @keyframes speak-1 { 0%{transform:scaleY(0.6);}50%{transform:scaleY(1);}100%{transform:scaleY(0.6);} }
        @keyframes speak-2 { 0%{transform:scaleY(0.7);}50%{transform:scaleY(1.1);}100%{transform:scaleY(0.7);} }
        @keyframes speak-3 { 0%{transform:scaleY(0.8);}50%{transform:scaleY(1.3);}100%{transform:scaleY(0.8);} }
        .animate-speak-1{animation: speak-1 700ms infinite ease-in-out; transform-origin: bottom}
        .animate-speak-2{animation: speak-2 600ms infinite ease-in-out; transform-origin: bottom}
        .animate-speak-3{animation: speak-3 500ms infinite ease-in-out; transform-origin: bottom}
      `}</style>
    </div>
  )
}

export default AudioControls
