const ChatBubble = ({ message, sender, theme = 'dark' }) => {
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
        </div>
        <p className="whitespace-pre-line">{message}</p>
      </div>
    </div>
  )
}

export default ChatBubble
