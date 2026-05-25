import AudioControls from './AudioControls'

const ChatBubble = ({ message, sender, theme = 'dark', audioControls }) => {
  const isUser = sender === 'user'
  const isDark = theme === 'dark'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} py-2`}> 
      <div className={`max-w-[80%] rounded-3xl px-4 py-3 text-sm leading-6 shadow-sm ${
        isUser
          ? 'bg-blue-600 text-white'
          : isDark
            ? 'bg-slate-800 text-slate-100'
            : 'bg-white text-slate-900 ring-1 ring-slate-200'
      }`}>
        <div className={`font-semibold uppercase tracking-[0.2em] text-[10px] ${
          isUser ? 'text-blue-100' : isDark ? 'text-slate-400' : 'text-slate-500'
        }`}>
          {isUser ? 'You' : 'EduAssist'}
          {!isUser && audioControls && (audioControls.status === 'playing' || audioControls.status === 'loading') && (
            <span className="ml-2 inline-flex items-center gap-2 text-[10px]">
              <span className={`inline-block h-2 w-2 rounded-full ${audioControls.status === 'playing' ? 'bg-green-400' : 'bg-blue-400'} animate-pulse`} />
              <span className="text-[10px] text-slate-400">{audioControls.status === 'loading' ? 'Speaking...' : 'Listening/Playing'}</span>
            </span>
          )}
        </div>
        <p className="whitespace-pre-line">{message}</p>
        {!isUser && audioControls && (
          <AudioControls
            isDark={isDark}
            status={audioControls.status}
            error={audioControls.error}
            progress={audioControls.progress}
            currentTime={audioControls.currentTime}
            duration={audioControls.duration}
            onPlay={audioControls.onPlay}
            onPause={audioControls.onPause}
            onResume={audioControls.onResume}
            onStop={audioControls.onStop}
            onReplay={audioControls.onReplay}
          />
        )}
      </div>
    </div>
  )
}

export default ChatBubble
